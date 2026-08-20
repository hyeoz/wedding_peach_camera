/**
 * 사용자가 직접 쓴 텍스트 카드 DSL 컴파일러.
 * 저장되는 것은 컴파일 결과가 아니라 원문이라, 이 파서가 곧 카드의 모양이다.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  CHOICE_SEPARATOR,
  STAMP_EXAMPLE,
  TEMPLATE_EXAMPLE,
  TOKEN_INPUT,
  parseTemplateSource,
  type ParseOptions,
} from '@/data/textTemplateParser';

const OPTIONS: ParseOptions = {
  id: 't1',
  label: '테스트 카드',
  tint: '#ffffff',
  emoji: '🌸',
  variant: 'card',
};

const parse = (source: string) => parseTemplateSource(source, OPTIONS);

describe('제목 줄', () => {
  it('제목만 있어도 컴파일된다', () => {
    const { template, errors } = parse('오늘의 기록');
    assert.deepEqual(errors, []);
    assert.equal(template?.headerTemplate, '오늘의 기록');
    assert.equal(template?.lines.length, 0);
  });

  it('제목에는 입력 토큰을 넣을 수 없다', () => {
    const { template, errors } = parse(`제목 ${TOKEN_INPUT}`);
    assert.equal(template, null);
    assert.equal(errors.length, 1);
  });

  it('제목에는 선택지를 넣을 수 없다', () => {
    const { template, errors } = parse(`제목 a ${CHOICE_SEPARATOR} b`);
    assert.equal(template, null);
    assert.equal(errors.length, 1);
  });
});

describe('본문 줄', () => {
  it('선택지 줄을 옵션 배열로 만든다', () => {
    const { template, errors } = parse(`제목\n식단 good ${CHOICE_SEPARATOR} bad`);
    assert.deepEqual(errors, []);
    assert.equal(template?.lines[0].type, 'choice');
    assert.equal(template?.lines[0].label, '식단');
    assert.deepEqual(template?.lines[0].options, ['good', 'bad']);
  });

  it('선택지가 3개 이상도 된다', () => {
    const { template } = parse(`제목\n기분 good ${CHOICE_SEPARATOR} soso ${CHOICE_SEPARATOR} bad`);
    assert.deepEqual(template?.lines[0].options, ['good', 'soso', 'bad']);
  });

  it('입력 줄은 note 가 된다', () => {
    const { template } = parse(`제목\n특이사항 ${TOKEN_INPUT}`);
    assert.equal(template?.lines[0].type, 'note');
    assert.equal(template?.lines[0].label, '특이사항');
  });

  it('토큰도 구분자도 없으면 정적 텍스트 줄', () => {
    const { template } = parse('제목\n그냥 한 줄');
    assert.equal(template?.lines[0].type, 'static');
  });

  it('항목 이름이 없는 선택지는 오류', () => {
    const { template, errors } = parse(`제목\ngood ${CHOICE_SEPARATOR} bad`);
    assert.equal(template, null);
    assert.ok(errors[0].includes('항목 이름'));
  });

  it('항목 이름이 없는 입력 줄은 오류', () => {
    const { template, errors } = parse(`제목\n${TOKEN_INPUT}`);
    assert.equal(template, null);
    assert.ok(errors[0].includes('항목 이름'));
  });

  it('너무 긴 선택지는 오류', () => {
    const { template, errors } = parse(`제목\n식단 ${'가'.repeat(13)} ${CHOICE_SEPARATOR} bad`);
    assert.equal(template, null);
    assert.ok(errors[0].includes('너무 깁니다'));
  });

  it('줄 key 는 서로 겹치지 않는다 (선택값·메모가 섞이면 안 된다)', () => {
    const { template } = parse(`제목\n메모 ${TOKEN_INPUT}\n메모 ${TOKEN_INPUT}\n메모 ${TOKEN_INPUT}`);
    const keys = template?.lines.map((line) => line.key) ?? [];
    assert.equal(keys.length, 3);
    assert.equal(new Set(keys).size, keys.length);
  });
});

describe('전체 원문', () => {
  it('빈 원문은 오류', () => {
    assert.equal(parse('   ').template, null);
    assert.ok(parse('').errors.length > 0);
  });

  it('앞뒤·중간 빈 줄은 무시한다', () => {
    const { template } = parse('\n\n제목\n\n메모 한 줄\n\n');
    assert.equal(template?.headerTemplate, '제목');
    assert.equal(template?.lines.length, 1);
  });

  it('줄 수 상한을 넘으면 오류', () => {
    const source = ['제목', ...Array.from({ length: 12 }, (_, i) => `줄${i}`)].join('\n');
    const { template, errors } = parse(source);
    assert.equal(template, null);
    assert.ok(errors[0].includes('줄이 너무 많습니다'));
  });

  it('앱이 제시하는 기본 예시는 항상 컴파일된다', () => {
    assert.deepEqual(parse(TEMPLATE_EXAMPLE).errors, []);
    assert.deepEqual(parse(STAMP_EXAMPLE).errors, []);
  });

  it('variant 와 stampColor 가 그대로 실린다', () => {
    const { template } = parseTemplateSource(STAMP_EXAMPLE, {
      ...OPTIONS,
      variant: 'stamp',
      stampColor: '#ff6a00',
    });
    assert.equal(template?.variant, 'stamp');
    assert.equal(template?.stampColor, '#ff6a00');
  });
});
