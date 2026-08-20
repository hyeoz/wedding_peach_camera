/**
 * 사진 촬영 일시 해석과 각인 포맷.
 * 타임스탬프 텍스트 카드가 이 값을 그대로 찍는다.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  exifTakenAt,
  formatShotDate,
  formatShotDateTime,
  formatShotFilm,
  formatShotTime,
  parseExifDateString,
  resolveTakenAt,
} from '@/utils/exif';

/** 로컬 시간 기준 2026-08-19 14:23:05 */
const SHOT = new Date(2026, 7, 19, 14, 23, 5).getTime();

describe('parseExifDateString', () => {
  it('EXIF 표준 형식(콜론 구분)을 로컬 시각으로 읽는다', () => {
    assert.equal(parseExifDateString('2026:08:19 14:23:05'), SHOT);
  });

  it('하이픈·T 구분자도 받아 준다', () => {
    assert.equal(parseExifDateString('2026-08-19 14:23:05'), SHOT);
    assert.equal(parseExifDateString('2026-08-19T14:23:05'), SHOT);
  });

  it('뒤에 밀리초·시간대가 붙어도 앞부분만 읽는다', () => {
    assert.equal(parseExifDateString('2026:08:19 14:23:05.123+09:00'), SHOT);
  });

  it('앞뒤 공백을 다듬는다', () => {
    assert.equal(parseExifDateString('  2026:08:19 14:23:05  '), SHOT);
  });

  it('문자열이 아니거나 형식이 다르면 null', () => {
    assert.equal(parseExifDateString('nope'), null);
    assert.equal(parseExifDateString('2026:08:19'), null);
    assert.equal(parseExifDateString(undefined), null);
    assert.equal(parseExifDateString(null), null);
    assert.equal(parseExifDateString(1234567890), null);
    assert.equal(parseExifDateString({}), null);
  });
});

describe('exifTakenAt', () => {
  it('평평한 키에서 찾는다', () => {
    assert.equal(exifTakenAt({ DateTimeOriginal: '2026:08:19 14:23:05' }), SHOT);
  });

  it('iOS 가 중첩해 주는 {Exif} 안도 본다', () => {
    assert.equal(exifTakenAt({ '{Exif}': { DateTimeOriginal: '2026:08:19 14:23:05' } }), SHOT);
    assert.equal(exifTakenAt({ '{TIFF}': { DateTime: '2026:08:19 14:23:05' } }), SHOT);
  });

  it('촬영 시각에 가까운 키를 먼저 쓴다', () => {
    const value = exifTakenAt({
      DateTime: '2020:01:01 00:00:00',
      DateTimeOriginal: '2026:08:19 14:23:05',
    });
    assert.equal(value, SHOT);
  });

  it('EXIF 가 없거나 날짜가 없으면 null', () => {
    assert.equal(exifTakenAt(null), null);
    assert.equal(exifTakenAt(undefined), null);
    assert.equal(exifTakenAt('문자열'), null);
    assert.equal(exifTakenAt({ Make: 'Apple' }), null);
  });
});

describe('resolveTakenAt', () => {
  it('EXIF 가 있으면 EXIF', () => {
    const r = resolveTakenAt({ exif: { DateTimeOriginal: '2026:08:19 14:23:05' } });
    assert.deepEqual(r, { value: SHOT, source: 'exif' });
  });

  it('EXIF 가 없으면 앨범 등록 시각', () => {
    const r = resolveTakenAt({ assetCreationTime: 1_700_000_000_000 });
    assert.deepEqual(r, { value: 1_700_000_000_000, source: 'assetCreation' });
  });

  it('초 단위로 들어온 등록 시각을 ms 로 올린다', () => {
    const r = resolveTakenAt({ assetCreationTime: 1_700_000_000 });
    assert.deepEqual(r, { value: 1_700_000_000_000, source: 'assetCreation' });
  });

  it('둘 다 없으면 현재 시각', () => {
    const before = Date.now();
    const r = resolveTakenAt({});
    assert.equal(r.source, 'now');
    assert.ok(r.value >= before && r.value <= Date.now());
  });

  it('쓸 수 없는 등록 시각은 무시한다', () => {
    assert.equal(resolveTakenAt({ assetCreationTime: 0 }).source, 'now');
    assert.equal(resolveTakenAt({ assetCreationTime: -1 }).source, 'now');
    assert.equal(resolveTakenAt({ assetCreationTime: null }).source, 'now');
    assert.equal(resolveTakenAt({ assetCreationTime: Number.NaN }).source, 'now');
  });
});

describe('각인 포맷', () => {
  it('날짜·시각·합본', () => {
    assert.equal(formatShotDate(SHOT), '2026.08.19');
    assert.equal(formatShotTime(SHOT), '14:23:05');
    assert.equal(formatShotDateTime(SHOT), '2026.08.19 14:23:05');
  });

  it('필름 각인은 두 자리 연도 + 월 일', () => {
    assert.equal(formatShotFilm(SHOT), "'26 8 19");
  });

  it('한 자리 월·일·시각은 0 을 채운다 (필름 각인만 예외)', () => {
    const early = new Date(2026, 0, 5, 9, 8, 7).getTime();
    assert.equal(formatShotDate(early), '2026.01.05');
    assert.equal(formatShotTime(early), '09:08:07');
    assert.equal(formatShotFilm(early), "'26 1 5");
  });
});
