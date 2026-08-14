/**
 * 테마 토큰 중 색상 외 상수(간격/라운드/그림자/폰트).
 * 색상은 이모지 테마에 따라 바뀌므로 ThemeContext의 useTheme()로 가져온다.
 */
import type { ViewStyle } from 'react-native';

export { fonts } from './fonts';
export { useTheme, useThemedStyles, type ThemeColors } from './ThemeContext';

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

/** 부드러운 그림자 (테마와 무관하게 은은한 톤 유지). */
export const shadow: ViewStyle = {
  shadowColor: '#7a1150',
  shadowOpacity: 0.16,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 6,
};
