/**
 * 디자인 토큰 (design_handoff_camera_app 기준).
 * 색상/라운드/그림자/간격을 한곳에 모아 화면 코드가 하드코딩 hex를 쓰지 않게 한다.
 */
import type { ViewStyle } from 'react-native';

export { fonts } from './fonts';

export const colors = {
  /** 배경 그라디언트 (160deg). */
  gradient: ['#ffe3f2', '#f6d7ff', '#e3d6ff'] as const,

  /** Primary — 핫핑크 계열. */
  primary: '#ff4fa3',
  primaryDeep: '#b31877',
  primaryDeeper: '#7a1150',
  primaryBadge: '#d6207a',

  /** Secondary — 라벤더 계열. */
  secondary: '#9b6bff',
  secondaryDeep: '#3d1a80',

  /** 텍스트. */
  text: '#3a1030',
  textMuted: '#8a5f7c',

  /** 라이트 틴트 / 보더. */
  tintPink: '#ffe0f0',
  tintPurple: '#ede2ff',
  border: '#f0c9e2',

  white: '#ffffff',
  canvas: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
} as const;

export const radius = {
  thumb: 14,
  card: 24,
  canvas: 24,
  pill: 999,
} as const;

/** 디자인의 0 6px 18px rgba(255,79,163,0.22) 그림자. */
export const shadow: ViewStyle = {
  shadowColor: '#ff4fa3',
  shadowOpacity: 0.22,
  shadowRadius: 18,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};
