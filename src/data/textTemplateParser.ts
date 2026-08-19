/**
 * 사용자 텍스트 템플릿 DSL 파서.
 *
 * 사용자가 줄 단위로 적은 문법을 TextTemplate(JSON)으로 컴파일한다.
 * 저장은 컴파일 결과가 아니라 이 원문(source)을 기준으로 하므로,
 * 나중에 문법이 확장돼도 저장된 데이터를 그대로 다시 컴파일하면 된다.
 *
 * 문법
 *   첫 줄                 카드 헤더
 *   {{nickname}}          프로필 닉네임으로 치환
 *   {{date}}              오늘 날짜로 치환
 *   라벨 a // b // c      선택지 중 택1
 *   라벨 {{input}}        자유 입력
 *
 * 예)
 *   {{nickname}}님의 {{date}}
 *   식단 good // bad
 *   운동 good // bad
 *   특이사항 {{input}}
 *
 * 구분자가 `//` 인 이유: 단일 `/` 를 쓰면 "촬영일 10/20" 같은 평범한 문장이
 * 선택지로 잘못 해석된다. `//` 는 일반 문장에 거의 나오지 않아 오탐이 없다.
 */
import { DEFAULT_CARD_EMOJI, type TextLine, type TextTemplate } from '@/data/textTemplates';

/** 선택지 구분자. 도움말·미리보기 안내 문구도 이 값을 쓴다. */
export const CHOICE_SEPARATOR = '//';

export const TOKEN_DATE = '{{date}}';
export const TOKEN_NICKNAME = '{{nickname}}';
export const TOKEN_INPUT = '{{input}}';

/** 등록 모달에서 그대로 보여주는 예시. */
export const TEMPLATE_EXAMPLE = [
  `${TOKEN_NICKNAME}님의 ${TOKEN_DATE}`,
  `식단 good ${CHOICE_SEPARATOR} bad`,
  `운동 good ${CHOICE_SEPARATOR} bad`,
  `특이사항 ${TOKEN_INPUT}`,
].join('\n');

export interface ParseResult {
  /** 컴파일 성공 시의 템플릿. 실패면 null. */
  template: TextTemplate | null;
  /** 사용자에게 보여줄 오류 메시지. 비어 있으면 성공. */
  errors: string[];
}

export interface ParseOptions {
  /** 컴파일된 템플릿에 부여할 id. */
  id: string;
  /** 라이브러리에 표시할 이름. */
  label: string;
  /** 카드 배경색. */
  tint: string;
  emoji?: string;
}

const MAX_LINES = 12;
/** 선택지 한 개의 최대 길이. 너무 길면 카드가 깨진다. */
const MAX_OPTION_LENGTH = 12;

/**
 * 한 줄을 "라벨 + 필드"로 나눈다.
 * 필드가 없으면(토큰도 구분자도 없으면) null 을 돌려 정적 텍스트 줄로 처리한다.
 */
function parseLine(raw: string, index: number): { line: TextLine | null; error?: string } {
  const text = raw.trim();
  const key = `l${index}`;

  if (text.includes(TOKEN_INPUT)) {
    const label = text.replace(TOKEN_INPUT, '').trim();
    if (!label) return { line: null, error: `${index + 1}번째 줄: ${TOKEN_INPUT} 앞에 항목 이름이 필요합니다.` };
    return { line: { key, label, type: 'note' } };
  }

  if (text.includes(CHOICE_SEPARATOR)) {
    // "식단 good // bad" → 라벨은 첫 구분자 앞 토큰들 중 마지막 공백 이전까지.
    const [head, ...rest] = text.split(CHOICE_SEPARATOR);
    const headParts = head.trim().split(/\s+/);
    const firstOption = headParts.pop() ?? '';
    const label = headParts.join(' ').trim();

    const options = [firstOption, ...rest.map((option) => option.trim())].filter(Boolean);

    if (!label) {
      return { line: null, error: `${index + 1}번째 줄: 선택지 앞에 항목 이름이 필요합니다.` };
    }
    if (options.length < 2) {
      return { line: null, error: `${index + 1}번째 줄: 선택지는 2개 이상이어야 합니다.` };
    }
    const tooLong = options.find((option) => option.length > MAX_OPTION_LENGTH);
    if (tooLong) {
      return {
        line: null,
        error: `${index + 1}번째 줄: 선택지 "${tooLong}" 가 너무 깁니다 (${MAX_OPTION_LENGTH}자 이하).`,
      };
    }
    return { line: { key, label, type: 'choice', options } };
  }

  // 토큰도 구분자도 없는 줄은 라벨만 있는 정적 텍스트로 둔다.
  return { line: { key, label: text, type: 'static' } };
}

/** DSL 원문을 TextTemplate 으로 컴파일한다. */
export function parseTemplateSource(source: string, options: ParseOptions): ParseResult {
  const errors: string[] = [];
  const rawLines = source.replace(/\r\n/g, '\n').split('\n');

  // 앞뒤 빈 줄은 버리고, 중간 빈 줄은 의미가 없으므로 무시한다.
  const lines = rawLines.map((line) => line.trim()).filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { template: null, errors: ['내용을 입력해 주세요.'] };
  }
  if (lines.length > MAX_LINES) {
    return {
      template: null,
      errors: [`줄이 너무 많습니다. ${MAX_LINES}줄까지 넣을 수 있어요 (현재 ${lines.length}줄).`],
    };
  }

  const [headerTemplate, ...bodyLines] = lines;

  if (headerTemplate.includes(TOKEN_INPUT)) {
    errors.push(`첫 줄은 카드 제목이라 ${TOKEN_INPUT} 을 넣을 수 없습니다.`);
  }
  if (headerTemplate.includes(CHOICE_SEPARATOR)) {
    errors.push(`첫 줄은 카드 제목이라 선택지(${CHOICE_SEPARATOR})를 넣을 수 없습니다.`);
  }

  const compiled: TextLine[] = [];
  bodyLines.forEach((raw, i) => {
    // key 는 헤더를 제외한 순번 기준이라 본문 인덱스를 그대로 쓴다.
    const { line, error } = parseLine(raw, i);
    if (error) errors.push(error);
    else if (line) compiled.push(line);
  });

  if (errors.length > 0) return { template: null, errors };

  return {
    template: {
      id: options.id,
      label: options.label,
      emoji: options.emoji || DEFAULT_CARD_EMOJI,
      headerTemplate,
      tint: options.tint,
      lines: compiled,
    },
    errors: [],
  };
}
