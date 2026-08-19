/**
 * 이모지별 테마 팔레트.
 * 프로필 이모지를 고르면 해당 이모지의 대표 색으로 앱 테마가 바뀐다.
 */

/** 테마마다 달라지는 색상 토큰. (white/canvas는 공통이라 ThemeColors에서 합쳐진다) */
export interface Palette {
  /** 배경 그라디언트 (3색). */
  gradient: readonly [string, string, string];
  primary: string;
  primaryDeep: string;
  primaryDeeper: string;
  primaryBadge: string;
  secondary: string;
  secondaryDeep: string;
  text: string;
  textMuted: string;
  /** primary 계열 라이트 틴트 (프레임 카드 등). */
  tintPink: string;
  /** secondary 계열 라이트 틴트 (스티커 카드 등). */
  tintPurple: string;
  border: string;
}

export const PALETTES = {
  pink: {
    gradient: ['#ffe3f2', '#f6d7ff', '#e3d6ff'],
    primary: '#ff4fa3',
    primaryDeep: '#b31877',
    primaryDeeper: '#7a1150',
    primaryBadge: '#d6207a',
    secondary: '#9b6bff',
    secondaryDeep: '#3d1a80',
    text: '#3a1030',
    textMuted: '#8a5f7c',
    tintPink: '#ffe0f0',
    tintPurple: '#ede2ff',
    border: '#f0c9e2',
  },
  peach: {
    gradient: ['#ffe9d6', '#ffe0d0', '#ffe7dc'],
    primary: '#ff7e5f',
    primaryDeep: '#d1502f',
    primaryDeeper: '#8f3417',
    primaryBadge: '#e85f38',
    secondary: '#ffb27a',
    secondaryDeep: '#9a4a12',
    text: '#3a2018',
    textMuted: '#9a7365',
    tintPink: '#ffe4d6',
    tintPurple: '#fff0e2',
    border: '#f6cdb9',
  },
  purple: {
    gradient: ['#efe3ff', '#e7d9ff', '#f3e0ff'],
    primary: '#9b6bff',
    primaryDeep: '#6a3fd1',
    primaryDeeper: '#3d1a80',
    primaryBadge: '#7c4fe0',
    secondary: '#c88bff',
    secondaryDeep: '#5a2a9a',
    text: '#26163a',
    textMuted: '#7d6f9a',
    tintPink: '#ece0ff',
    tintPurple: '#f0e6ff',
    border: '#d8c9f0',
  },
  red: {
    gradient: ['#ffe0e0', '#ffd9e0', '#ffe3ec'],
    primary: '#ff5a5f',
    primaryDeep: '#c62f43',
    primaryDeeper: '#8a1428',
    primaryBadge: '#e23a4e',
    secondary: '#ff8fa3',
    secondaryDeep: '#a11d2e',
    text: '#3a1620',
    textMuted: '#9a6b72',
    tintPink: '#ffdfe2',
    tintPurple: '#ffe8ec',
    border: '#f4c2c9',
  },
  gold: {
    gradient: ['#fff3d6', '#ffeecb', '#fff6df'],
    primary: '#f5a623',
    primaryDeep: '#c67c0a',
    primaryDeeper: '#8a5300',
    primaryBadge: '#e0951a',
    secondary: '#ffd36b',
    secondaryDeep: '#8a5a00',
    text: '#3a2e14',
    textMuted: '#9a8560',
    tintPink: '#fff0cf',
    tintPurple: '#fff7e0',
    border: '#f0dca8',
  },
  brown: {
    gradient: ['#f3e6da', '#efe0d2', '#f6e8dc'],
    primary: '#a1724e',
    primaryDeep: '#7a5236',
    primaryDeeper: '#573823',
    primaryBadge: '#8a5f3e',
    secondary: '#c99a6f',
    secondaryDeep: '#5a3a22',
    text: '#33241a',
    textMuted: '#8a7565',
    tintPink: '#efe0d2',
    tintPurple: '#f5ece2',
    border: '#e0ccb8',
  },
  blue: {
    gradient: ['#dcecff', '#d6e6ff', '#e0f0ff'],
    primary: '#3a8dde',
    primaryDeep: '#1f5fa8',
    primaryDeeper: '#123f73',
    primaryBadge: '#2f79c4',
    secondary: '#7fb8f0',
    secondaryDeep: '#123f73',
    text: '#16283a',
    textMuted: '#607890',
    tintPink: '#d9e9ff',
    tintPurple: '#e6f2ff',
    border: '#bcd6f0',
  },
  rainbow: {
    gradient: ['#ffe3f2', '#e9dbff', '#dcefff'],
    primary: '#ff5aa8',
    primaryDeep: '#8a3fd1',
    primaryDeeper: '#5a1a80',
    primaryBadge: '#c44fd0',
    secondary: '#5aa0ff',
    secondaryDeep: '#2a5a9a',
    text: '#2a1a3a',
    textMuted: '#7d7095',
    tintPink: '#ffe0f0',
    tintPurple: '#e6e0ff',
    border: '#e2cdf0',
  },
} satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;

export const DEFAULT_PALETTE: PaletteName = 'pink';

/** 프로필 이모지 → 팔레트 매핑. */
export const EMOJI_PALETTE: Record<string, PaletteName> = {
  '🍑': 'peach',
  '🐰': 'pink',
  '🐱': 'brown',
  '🐻': 'brown',
  '🌸': 'pink',
  '🎀': 'pink',
  '⭐': 'gold',
  '🍒': 'red',
  '🦄': 'purple',
  '👾': 'purple',
  '🌷': 'purple',
  '🐣': 'gold',
  '🍓': 'red',
  '🐧': 'blue',
  '💦': 'blue',
  '🌈': 'rainbow',
  '🧸': 'brown',
  '💐': 'pink',
  '👑': 'gold',
  // 로봇은 금속·기계 느낌이라 차가운 계열이 어울린다. 같은 blue 인 🐧/💦 와 한 묶음.
  '🤖': 'blue',
  // 해바라기는 노란 꽃이라 gold. ⭐/👑/🐣 와 같은 계열.
  '🌻': 'gold',
};

export function paletteForEmoji(emoji: string): Palette {
  return PALETTES[EMOJI_PALETTE[emoji] ?? DEFAULT_PALETTE];
}
