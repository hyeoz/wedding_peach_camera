/**
 * 텍스트 스티커 템플릿 (JSON 형식 정의).
 *
 * 사진 위에 붙이는 "다이어리 카드" 형태의 텍스트 스티커.
 * 헤더는 프로필 닉네임/오늘 날짜 토큰을 지원하고,
 * 각 줄은 선택(choice) · 자유 입력(note) · 정적 텍스트(static)로 구성된다.
 *
 * 여기 배열은 앱에 내장된 기본 제공 템플릿이다.
 * 사용자가 직접 만든 템플릿은 textTemplateParser 가 같은 모양으로 컴파일해
 * UserLibraryContext 가 들고 있는다.
 */

/** 카드의 한 줄. */
export interface TextLine {
  /** 줄 식별 키 (배치된 카드의 상태 저장에 사용). */
  key: string;
  /** 앞에 붙는 라벨 (예: 식단, 운동, 특이사항). */
  label: string;
  /** choice = 옵션 중 택1 토글, note = 자유 입력, static = 고정 텍스트. */
  type: 'choice' | 'note' | 'static';
  /** choice일 때 선택지. */
  options?: string[];
}

/**
 * card  = 배경·테두리가 있는 다이어리 카드 (기본)
 * stamp = 배경 없이 글자만 얹는 필름 카메라 날짜 각인풍
 */
export type TextVariant = 'card' | 'stamp';

export interface TextTemplate {
  id: string;
  /** 라이브러리 썸네일 라벨. */
  label: string;
  /** 썸네일/카드 헤더 이모지. */
  emoji: string;
  /**
   * 헤더 문구. 토큰:
   * {{nickname}} → 프로필 닉네임, {{date}} → 오늘 날짜,
   * {{shotDate}} · {{shotTime}} · {{shotDateTime}} · {{shotFilm}} → 사진 촬영 일시.
   */
  headerTemplate: string;
  lines: TextLine[];
  /** 카드 배경 틴트. */
  tint: string;
  /** 렌더 방식. 미지정이면 card. */
  variant?: TextVariant;
  /** stamp 변형의 글자색. */
  stampColor?: string;
}

/** 타임스탬프 글자색 선택지. 필름 각인은 주황이 기본이다. */
export const STAMP_COLORS = [
  { id: 'orange', label: '주황', value: '#ff8a3d' },
  { id: 'yellow', label: '노랑', value: '#ffd24a' },
  { id: 'white', label: '흰색', value: '#ffffff' },
] as const;

export const DEFAULT_STAMP_COLOR = STAMP_COLORS[0].value;

/** 카드 배경으로 고를 수 있는 색. 등록 화면의 색 선택지로도 쓴다. */
export const CARD_TINTS = [
  { id: 'pink', label: '핑크', value: '#fff2f8' },
  { id: 'lavender', label: '라벤더', value: '#f3f0ff' },
  { id: 'cream', label: '크림', value: '#fffaf0' },
  { id: 'mint', label: '민트', value: '#eefbf4' },
  { id: 'sky', label: '스카이', value: '#eef6ff' },
  { id: 'white', label: '화이트', value: '#ffffff' },
] as const;

export const DEFAULT_CARD_TINT = CARD_TINTS[0].value;

/**
 * 카드 머리글에 붙는 이모지 선택지.
 * 기록·다이어리 성격에 맞는 것들로 골랐고, 목록에 없더라도 기존에 저장된
 * 이모지는 그대로 렌더된다(하위 호환은 storage 의 기본값 처리에 맡긴다).
 */
export const CARD_EMOJIS = [
  '📝', '📔', '🗓️', '✅', '💬', '⭐',
  '🌈', '💖', '🍑', '☕', '🔥', '🤖',
  '👾', '🎀', '🐥', '🌻',
] as const;

export const DEFAULT_CARD_EMOJI = CARD_EMOJIS[0];

export const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: 't1',
    label: '데일리 체크',
    emoji: '📔',
    headerTemplate: '{{nickname}}님의 {{date}}',
    tint: '#fff2f8',
    lines: [
      { key: 'diet', label: '식단', type: 'choice', options: ['good', 'bad'] },
      { key: 'workout', label: '운동', type: 'choice', options: ['good', 'bad'] },
      { key: 'note', label: '특이사항', type: 'note' },
    ],
  },
  {
    id: 't2',
    label: '오늘 기분',
    emoji: '🌈',
    headerTemplate: '{{nickname}}님의 {{date}}',
    tint: '#f3f0ff',
    lines: [
      { key: 'mood', label: '기분', type: 'choice', options: ['good', 'soso', 'bad'] },
      { key: 'memo', label: '한줄일기', type: 'note' },
    ],
  },
  {
    id: 't3',
    label: '심플 날짜',
    emoji: '🗓️',
    headerTemplate: '{{nickname}}님의 {{date}}',
    tint: '#fffaf0',
    lines: [],
  },
  {
    id: 't4',
    label: '타임스탬프',
    emoji: '📷',
    // 사진의 EXIF 촬영 일시를 그대로 각인한다.
    headerTemplate: '{{shotDateTime}}',
    tint: 'transparent',
    lines: [],
    variant: 'stamp',
    stampColor: DEFAULT_STAMP_COLOR,
  },
  {
    id: 't5',
    label: '필름 날짜',
    emoji: '🎞️',
    headerTemplate: '{{shotFilm}}',
    tint: 'transparent',
    lines: [],
    variant: 'stamp',
    stampColor: DEFAULT_STAMP_COLOR,
  },
];

/** 내장 템플릿 조회. 내장은 삭제할 수 없다(LibraryItem.builtIn 으로 구분). */
export function findBuiltInTemplate(id: string): TextTemplate | undefined {
  return TEXT_TEMPLATES.find((t) => t.id === id);
}
