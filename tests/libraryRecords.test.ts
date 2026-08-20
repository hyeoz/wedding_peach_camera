/**
 * AsyncStorage 레코드 ↔ LibraryItem 변환.
 *
 * "앱 업데이트하면 등록한 프레임·스티커가 사라진다" 가 살던 자리다.
 * 저장값에 앱 컨테이너 경로가 새어 나가는 순간 다음 업데이트에서 재발한다.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import type { LibraryItem } from '@/data/library';
import { LIBRARY_DIRNAME } from '@/storage/libraryPaths';
import {
  hasLegacyImageRecords,
  readImageRecords,
  writeImageRecords,
} from '@/storage/libraryRecords';

const OLD_DOCS = 'file:///var/mobile/Containers/Data/Application/AAAAAAAA-1111/Documents/';
const NEW_DOCS = 'file:///var/mobile/Containers/Data/Application/BBBBBBBB-2222/Documents/';

describe('readImageRecords', () => {
  it('현재 형식(path)을 지금 설치본 기준으로 해석한다', () => {
    const items = readImageRecords(
      [{ id: 'f1', label: '내 프레임', emoji: '🖼️', path: `${LIBRARY_DIRNAME}/f1.png` }],
      NEW_DOCS,
    );
    assert.equal(items.length, 1);
    assert.equal(items[0].uri, `${NEW_DOCS}${LIBRARY_DIRNAME}/f1.png`);
  });

  it('예전 형식(절대 uri)을 새 컨테이너로 되짚는다 — 깨진 링크 복구', () => {
    const items = readImageRecords(
      [{ id: 'f1', label: '내 프레임', emoji: '🖼️', uri: `${OLD_DOCS}${LIBRARY_DIRNAME}/f1.png` }],
      NEW_DOCS,
    );
    assert.equal(items[0].uri, `${NEW_DOCS}${LIBRARY_DIRNAME}/f1.png`);
    assert.ok(!items[0].uri?.includes('AAAAAAAA'), '예전 컨테이너가 남으면 안 된다');
  });

  it('path 가 있으면 낡은 uri 보다 우선한다', () => {
    const items = readImageRecords(
      [
        {
          id: 'f1',
          label: 'x',
          emoji: '🖼️',
          path: `${LIBRARY_DIRNAME}/new.png`,
          uri: `${OLD_DOCS}${LIBRARY_DIRNAME}/old.png`,
        },
      ],
      NEW_DOCS,
    );
    assert.equal(items[0].uri, `${NEW_DOCS}${LIBRARY_DIRNAME}/new.png`);
  });

  it('이모지가 없던 시절 레코드에 기본값을 채운다', () => {
    const items = readImageRecords([{ id: 'f1', label: 'x', path: `${LIBRARY_DIRNAME}/a.png` }], NEW_DOCS);
    assert.ok(items[0].emoji);
  });

  it('알아볼 수 없는 항목은 버린다', () => {
    const items = readImageRecords(
      [
        null,
        'text',
        {},
        { id: 'f1' },
        { label: 'x', path: 'a.png' },
        { id: 'f2', label: 'ok', path: '' },
        { id: 'f3', label: 'ok', path: `${LIBRARY_DIRNAME}/ok.png` },
      ],
      NEW_DOCS,
    );
    assert.deepEqual(
      items.map((item) => item.id),
      ['f3'],
    );
  });

  it('배열이 아니면 빈 목록', () => {
    assert.deepEqual(readImageRecords(undefined, NEW_DOCS), []);
    assert.deepEqual(readImageRecords({}, NEW_DOCS), []);
    assert.deepEqual(readImageRecords('x', NEW_DOCS), []);
  });

  it('문서 디렉터리를 모르면 빈 목록 (잘못된 경로를 만들지 않는다)', () => {
    assert.deepEqual(
      readImageRecords([{ id: 'f1', label: 'x', path: `${LIBRARY_DIRNAME}/a.png` }], null),
      [],
    );
  });
});

describe('writeImageRecords', () => {
  const item = (uri: string): LibraryItem => ({ id: 'f1', label: '내 프레임', emoji: '🖼️', uri });

  it('절대 uri 를 상대 경로로 줄여 저장한다', () => {
    const [record] = writeImageRecords([item(`${NEW_DOCS}${LIBRARY_DIRNAME}/f1.png`)]);
    assert.equal(record.path, `${LIBRARY_DIRNAME}/f1.png`);
  });

  it('저장값에 앱 컨테이너 경로가 절대 남지 않는다', () => {
    const records = writeImageRecords([
      item(`${NEW_DOCS}${LIBRARY_DIRNAME}/f1.png`),
      item(`${OLD_DOCS}${LIBRARY_DIRNAME}/f2.png`),
    ]);
    for (const record of records) {
      const path = record.path ?? '';
      assert.ok(!path.includes('Containers'), path);
      assert.ok(!path.includes('file://'), path);
      assert.ok(!path.startsWith('/'), path);
    }
  });

  it('예전 형식 uri 필드를 다시 쓰지 않는다', () => {
    const [record] = writeImageRecords([item(`${OLD_DOCS}${LIBRARY_DIRNAME}/f1.png`)]);
    assert.equal(record.uri, undefined);
  });

  it('파일이 없다고 표시된 항목도 경로를 잃지 않는다', () => {
    const missing: LibraryItem = {
      ...item(`${NEW_DOCS}${LIBRARY_DIRNAME}/gone.png`),
      missing: true,
    };
    const [record] = writeImageRecords([missing]);
    assert.equal(record.path, `${LIBRARY_DIRNAME}/gone.png`);
  });
});

describe('hasLegacyImageRecords', () => {
  it('path 없이 uri 만 있는 레코드를 찾아낸다', () => {
    assert.equal(
      hasLegacyImageRecords([{ id: 'f1', label: 'x', uri: `${OLD_DOCS}${LIBRARY_DIRNAME}/f1.png` }]),
      true,
    );
  });

  it('새 형식만 있으면 거짓 (매번 다시 쓰지 않게)', () => {
    assert.equal(
      hasLegacyImageRecords([{ id: 'f1', label: 'x', path: `${LIBRARY_DIRNAME}/f1.png` }]),
      false,
    );
  });

  it('path 가 있으면 uri 가 남아 있어도 거짓', () => {
    assert.equal(
      hasLegacyImageRecords([
        { id: 'f1', label: 'x', path: `${LIBRARY_DIRNAME}/f1.png`, uri: 'file:///old/f1.png' },
      ]),
      false,
    );
  });

  it('빈 목록·배열 아님은 거짓', () => {
    assert.equal(hasLegacyImageRecords([]), false);
    assert.equal(hasLegacyImageRecords(undefined), false);
    assert.equal(hasLegacyImageRecords({}), false);
    assert.equal(hasLegacyImageRecords([null, 'x', 42]), false);
  });

  it('한 건만 예전 형식이어도 참', () => {
    assert.equal(
      hasLegacyImageRecords([
        { id: 'f1', label: 'x', path: `${LIBRARY_DIRNAME}/f1.png` },
        { id: 'f2', label: 'y', uri: `${OLD_DOCS}${LIBRARY_DIRNAME}/f2.png` },
      ]),
      true,
    );
  });

  it('다시 쓴 결과에는 예전 형식이 남지 않는다 (한 번으로 끝난다)', () => {
    const legacy = [{ id: 'f1', label: 'x', emoji: '🖼️', uri: `${OLD_DOCS}${LIBRARY_DIRNAME}/f1.png` }];
    const rewritten = writeImageRecords(readImageRecords(legacy, NEW_DOCS));
    assert.equal(hasLegacyImageRecords(rewritten), false);
  });
});

describe('앱 업데이트 왕복', () => {
  it('컨테이너 UUID 가 바뀌어도 같은 파일을 계속 가리킨다', () => {
    // 1) 예전 설치본에서 등록 — 그때는 절대 경로로 저장돼 있었다
    const legacy = [
      { id: 'f1', label: '내 프레임', emoji: '🖼️', uri: `${OLD_DOCS}${LIBRARY_DIRNAME}/f1.png` },
    ];

    // 2) 업데이트 후 읽기 — 새 컨테이너 기준으로 복구된다
    const recovered = readImageRecords(legacy, NEW_DOCS);
    assert.equal(recovered[0].uri, `${NEW_DOCS}${LIBRARY_DIRNAME}/f1.png`);

    // 3) 다시 저장 — 이번엔 상대 경로로 남는다
    const saved = writeImageRecords(recovered);
    assert.equal(saved[0].path, `${LIBRARY_DIRNAME}/f1.png`);

    // 4) 다음 업데이트에서 또 컨테이너가 바뀌어도 그대로 따라온다
    const third = 'file:///var/mobile/Containers/Data/Application/CCCCCCCC-3333/Documents/';
    assert.equal(
      readImageRecords(saved, third)[0].uri,
      `${third}${LIBRARY_DIRNAME}/f1.png`,
    );
  });

  it('여러 번 왕복해도 레코드가 자라거나 변형되지 않는다', () => {
    let records = writeImageRecords(
      readImageRecords(
        [{ id: 'f1', label: 'x', emoji: '🖼️', uri: `${OLD_DOCS}${LIBRARY_DIRNAME}/f1.png` }],
        NEW_DOCS,
      ),
    );
    const first = JSON.stringify(records);
    for (let i = 0; i < 3; i += 1) {
      records = writeImageRecords(readImageRecords(records, NEW_DOCS));
    }
    assert.equal(JSON.stringify(records), first);
  });
});
