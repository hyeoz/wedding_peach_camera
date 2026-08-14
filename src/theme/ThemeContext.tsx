/**
 * 테마 컨텍스트.
 * 프로필 이모지에 따라 팔레트를 골라 앱 전역 색상을 제공한다.
 *
 * 사용 패턴:
 *   const colors = useTheme();
 *   const styles = useThemedStyles(makeStyles);   // makeStyles = (colors) => StyleSheet.create({...})
 */
import React, { createContext, useContext, useMemo } from 'react';
import type { StyleSheet } from 'react-native';

import { useProfile } from '@/context/ProfileContext';
import { paletteForEmoji, type Palette } from '@/theme/palettes';

/** 앱에서 사용하는 전체 색상 토큰 (팔레트 + 공통색). */
export interface ThemeColors extends Palette {
  white: string;
  canvas: string;
}

const ThemeContext = createContext<ThemeColors | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();

  const colors = useMemo<ThemeColors>(() => {
    const palette = paletteForEmoji(profile.emoji);
    return { ...palette, white: '#ffffff', canvas: '#000000' };
  }, [profile.emoji]);

  return <ThemeContext.Provider value={colors}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeColors {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

type StyleSheetNamedStyles = Parameters<typeof StyleSheet.create>[0];

/** 팔레트가 바뀔 때만 스타일시트를 재생성한다. */
export function useThemedStyles<T extends StyleSheetNamedStyles>(
  factory: (colors: ThemeColors) => T,
): T {
  const colors = useTheme();
  return useMemo(() => factory(colors), [colors, factory]);
}
