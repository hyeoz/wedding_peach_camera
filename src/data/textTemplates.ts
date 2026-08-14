/**
 * 텍스트 스티커 템플릿 (JSON 형식 정의).
 *
 * 사진 위에 붙이는 "다이어리 카드" 형태의 텍스트 스티커.
 * 헤더는 프로필 닉네임/오늘 날짜 플레이스홀더를 지원하고,
 * 각 줄은 good/bad 선택(choice) 또는 자유 메모(note)로 구성된다.
 *
 * 새 템플릿을 추가하려면 이 배열에 JSON 객체만 추가하면 된다.
 */

/** 카드의 한 줄. */
export interface TextLine {
  /** 줄 식별 키 (배치된 카드의 상태 저장에 사용). */
  key: string;
  /** 앞에 붙는 라벨 (예: 식단, 운동, 특이사항). */
  label: string;
  /** choice = 옵션 중 택1 토글, note = 자유 입력. */
  type: 'choice' | 'note';
  /** choice일 때 선택지. */
  options?: string[];
}

export interface TextTemplate {
  id: string;
  /** 라이브러리 썸네일 라벨. */
  label: string;
  /** 썸네일/카드 헤더 이모지. */
  emoji: string;
  /**
   * 헤더 문구. 플레이스홀더:
   * {nickname} → 프로필 닉네임, {date} → 오늘 날짜.
   */
  headerTemplate: string;
  lines: TextLine[];
  /** 카드 배경 틴트. */
  tint: string;
}

export const TEXT_TEMPLATES: TextTemplate[] = [
  {
    id: 't1',
    label: '데일리 체크',
    emoji: '📔',
    headerTemplate: '{nickname}님의 {date}',
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
    headerTemplate: '{nickname}님의 {date}',
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
    headerTemplate: '{nickname}님의 {date}',
    tint: '#fffaf0',
    lines: [],
  },
];

export function findTemplate(id: string): TextTemplate | undefined {
  return TEXT_TEMPLATES.find((t) => t.id === id);
}
