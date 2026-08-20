/**
 * 등록 이미지 경로 저장 형식.
 *
 * 여기가 깨지면 "앱 업데이트하면 등록한 프레임·스티커가 사라진다"가 다시 재현된다.
 * iOS는 업데이트마다 앱 컨테이너 UUID를 새로 발급하므로, 절대 경로를 저장하면
 * 파일이 멀쩡히 남아 있어도 링크가 전부 끊긴다.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  LIBRARY_DIRNAME,
  isLibraryPath,
  toLibraryPath,
  toLibraryUri,
} from '@/storage/libraryPaths';

const OLD_DOCS = 'file:///var/mobile/Containers/Data/Application/AAAAAAAA-1111/Documents/';
const NEW_DOCS = 'file:///var/mobile/Containers/Data/Application/BBBBBBBB-2222/Documents/';

describe('toLibraryPath', () => {
  it('절대 URI 에서 문서 디렉터리 기준 상대 경로만 남긴다', () => {
    assert.equal(
      toLibraryPath(`${OLD_DOCS}${LIBRARY_DIRNAME}/frame-1.png`),
      `${LIBRARY_DIRNAME}/frame-1.png`,
    );
  });

  it('이미 상대 경로면 그대로 둔다', () => {
    assert.equal(toLibraryPath(`${LIBRARY_DIRNAME}/frame-1.png`), `${LIBRARY_DIRNAME}/frame-1.png`);
  });

  it('여러 번 적용해도 결과가 같다', () => {
    const once = toLibraryPath(`${OLD_DOCS}${LIBRARY_DIRNAME}/sticker-9.jpg`);
    assert.equal(toLibraryPath(once), once);
    assert.equal(toLibraryPath(toLibraryPath(once)), once);
  });

  it('user-library 밖의 Documents 경로는 Documents 기준으로 자른다', () => {
    assert.equal(toLibraryPath(`${OLD_DOCS}legacy/frame-1.png`), 'legacy/frame-1.png');
  });

  it('알아볼 수 없는 절대 경로는 파일명만 살려 라이브러리 폴더로 넣는다', () => {
    assert.equal(toLibraryPath('file:///tmp/somewhere/frame-1.png'), `${LIBRARY_DIRNAME}/frame-1.png`);
  });

  it('빈 값은 빈 문자열', () => {
    assert.equal(toLibraryPath(''), '');
    assert.equal(toLibraryPath('   '), '');
    assert.equal(toLibraryPath(undefined), '');
    assert.equal(toLibraryPath(null), '');
  });

  it('./ 접두사와 앞쪽 슬래시를 정리한다', () => {
    assert.equal(toLibraryPath(`./${LIBRARY_DIRNAME}/a.png`), `${LIBRARY_DIRNAME}/a.png`);
  });
});

describe('toLibraryUri', () => {
  it('상대 경로를 지금 설치본의 절대 URI로 해석한다', () => {
    assert.equal(
      toLibraryUri(`${LIBRARY_DIRNAME}/frame-1.png`, NEW_DOCS),
      `${NEW_DOCS}${LIBRARY_DIRNAME}/frame-1.png`,
    );
  });

  it('업데이트로 컨테이너가 바뀌어도 예전 절대 경로가 복구된다', () => {
    const stored = `${OLD_DOCS}${LIBRARY_DIRNAME}/frame-1.png`;
    assert.equal(
      toLibraryUri(stored, NEW_DOCS),
      `${NEW_DOCS}${LIBRARY_DIRNAME}/frame-1.png`,
      '예전 UUID 가 그대로 남으면 깨진 링크가 된다',
    );
  });

  it('문서 디렉터리 끝의 슬래시 유무를 가리지 않는다', () => {
    const withoutSlash = NEW_DOCS.replace(/\/$/, '');
    assert.equal(
      toLibraryUri(`${LIBRARY_DIRNAME}/a.png`, withoutSlash),
      `${NEW_DOCS}${LIBRARY_DIRNAME}/a.png`,
    );
  });

  it('경로나 문서 디렉터리가 없으면 undefined', () => {
    assert.equal(toLibraryUri('', NEW_DOCS), undefined);
    assert.equal(toLibraryUri(`${LIBRARY_DIRNAME}/a.png`, null), undefined);
    assert.equal(toLibraryUri(`${LIBRARY_DIRNAME}/a.png`, undefined), undefined);
  });
});

describe('isLibraryPath', () => {
  it('우리가 만든 등록 이미지만 참', () => {
    assert.equal(isLibraryPath(`${OLD_DOCS}${LIBRARY_DIRNAME}/frame-1.png`), true);
    assert.equal(isLibraryPath(`${LIBRARY_DIRNAME}/frame-1.png`), true);
    assert.equal(isLibraryPath('file:///tmp/x/frame-1.png'), true, '파일명 복구 경로도 포함');
  });

  it('Documents 안의 다른 폴더나 빈 값은 거짓', () => {
    assert.equal(isLibraryPath(`${OLD_DOCS}other/frame-1.png`), false);
    assert.equal(isLibraryPath(''), false);
  });
});

describe('저장 → 읽기 왕복', () => {
  it('설치본이 바뀌어도 같은 파일을 가리킨다', () => {
    // 1) 등록: 그때의 절대 경로
    const registered = `${OLD_DOCS}${LIBRARY_DIRNAME}/sticker-42.png`;
    // 2) 저장: 상대 경로로 정규화
    const stored = toLibraryPath(registered);
    assert.equal(stored, `${LIBRARY_DIRNAME}/sticker-42.png`);
    assert.ok(!stored.includes('Containers'), '저장값에 컨테이너 경로가 남으면 안 된다');

    // 3) 앱 업데이트 후 읽기: 새 컨테이너 기준으로 해석
    assert.equal(
      toLibraryUri(stored, NEW_DOCS),
      `${NEW_DOCS}${LIBRARY_DIRNAME}/sticker-42.png`,
    );
    // 4) 다시 저장해도 값이 자라지 않는다
    assert.equal(toLibraryPath(toLibraryUri(stored, NEW_DOCS)), stored);
  });
});
