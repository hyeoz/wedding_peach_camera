/**
 * 식단공유 스토리: 날짜 키·몸무게 파싱·전날 대비·회차 제안.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  findPrevious,
  formatDateInput,
  formatDelta,
  formatStoryDate,
  formatWeight,
  parseDateInput,
  parseWeight,
  suggestDay,
  toDateKey,
  upsertEntry,
  type DietLogEntry,
} from '@/utils/dietLog';

describe('toDateKey / formatStoryDate', () => {
  it('로컬 날짜 기준으로 키를 만든다 (자정 직후에도 하루 밀리지 않음)', () => {
    assert.equal(toDateKey(new Date(2026, 10, 10, 0, 5)), '2026-11-10');
    assert.equal(toDateKey(new Date(2026, 0, 3, 23, 59)), '2026-01-03');
  });

  it('스토리 머리글 날짜는 요일, 월 일', () => {
    assert.equal(formatStoryDate(new Date(2026, 10, 10)), 'Tuesday, Nov 10');
  });
});

describe('parseWeight / formatWeight', () => {
  it('정수·소수·쉼표 소수점을 받는다', () => {
    assert.equal(parseWeight('58'), 58);
    assert.equal(parseWeight(' 58.4 '), 58.4);
    assert.equal(parseWeight('58,4'), 58.4);
  });

  it('숫자가 아니거나 범위를 벗어나면 null', () => {
    assert.equal(parseWeight(''), null);
    assert.equal(parseWeight('abc'), null);
    assert.equal(parseWeight('0'), null);
    assert.equal(parseWeight('-3'), null);
    assert.equal(parseWeight('1000'), null);
  });

  it('소수 첫째 자리로 표기', () => {
    assert.equal(formatWeight(58), '58.0');
    assert.equal(formatWeight(58.44), '58.4');
  });
});

describe('formatDelta', () => {
  it('감소·증가·변화 없음 부호', () => {
    assert.equal(formatDelta(58.4, 58.7), '− 0.3 kg');
    assert.equal(formatDelta(58.6, 58.4), '+ 0.2 kg');
    assert.equal(formatDelta(58.4, 58.4), '± 0.0 kg');
  });

  it('부동소수 오차를 표기에 남기지 않는다', () => {
    assert.equal(formatDelta(0.3, 0.1 + 0.2), '± 0.0 kg');
    assert.equal(formatDelta(60.1, 60), '+ 0.1 kg');
  });
});

describe('findPrevious / suggestDay', () => {
  const entries: DietLogEntry[] = [
    { date: '2026-11-08', weight: 59.0, day: 10 },
    { date: '2026-11-09', weight: 58.7, day: 11 },
    { date: '2026-11-10', weight: 58.4, day: 12 },
  ];

  it('오늘보다 앞선 가장 최근 기록을 전날로 잡는다', () => {
    assert.equal(findPrevious(entries, '2026-11-10')?.weight, 58.7);
    assert.equal(findPrevious(entries, '2026-11-12')?.weight, 58.4);
    assert.equal(findPrevious(entries, '2026-11-08'), null);
  });

  it('회차는 오늘 기록이 있으면 그대로, 없으면 직전 + 1, 처음이면 1', () => {
    assert.equal(suggestDay(entries, '2026-11-10'), 12);
    assert.equal(suggestDay(entries, '2026-11-11'), 13);
    assert.equal(suggestDay([], '2026-11-11'), 1);
  });
});

describe('upsertEntry', () => {
  it('같은 날짜는 덮어쓰고 날짜순 정렬', () => {
    const next = upsertEntry(
      [
        { date: '2026-11-10', weight: 58.4 },
        { date: '2026-11-08', weight: 59 },
      ],
      { date: '2026-11-10', weight: 58.2, day: 12 },
    );
    assert.deepEqual(next, [
      { date: '2026-11-08', weight: 59 },
      { date: '2026-11-10', weight: 58.2, day: 12 },
    ]);
  });

  it('limit 를 넘으면 오래된 것부터 버린다', () => {
    const next = upsertEntry(
      [
        { date: '2026-11-01', weight: 60 },
        { date: '2026-11-02', weight: 59.9 },
      ],
      { date: '2026-11-03', weight: 59.8 },
      2,
    );
    assert.deepEqual(
      next.map((entry) => entry.date),
      ['2026-11-02', '2026-11-03'],
    );
  });
});

describe('parseDateInput / formatDateInput', () => {
  const ref = new Date(2026, 10, 11);

  it('연월일 구분자는 점·하이픈·슬래시 모두 받는다', () => {
    for (const text of ['2026.11.10', '2026-11-10', '2026/11/10', ' 2026. 11. 10 ']) {
      assert.equal(toDateKey(parseDateInput(text, ref)!), '2026-11-10');
    }
  });

  it('월.일만 쓰면 기준 날짜의 해로 본다', () => {
    assert.equal(toDateKey(parseDateInput('11.10', ref)!), '2026-11-10');
  });

  it('없는 날짜·형식이 틀린 입력은 null', () => {
    assert.equal(parseDateInput('2026.02.30', ref), null);
    assert.equal(parseDateInput('11', ref), null);
    assert.equal(parseDateInput('어제', ref), null);
  });

  it('입력 칸 표기는 YYYY.MM.DD', () => {
    assert.equal(formatDateInput(new Date(2026, 0, 3)), '2026.01.03');
  });
});
