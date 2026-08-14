import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme';

/** 앱 공통 배경 그라디언트. 프로필 이모지 테마에 따라 색이 바뀐다. */
export function GradientBackground({
  children,
  style,
}: {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useTheme();
  return (
    <LinearGradient
      colors={colors.gradient}
      locations={[0, 0.45, 1]}
      // 160deg 근사: 좌상단 → 우하단으로 살짝 기울인 방향.
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.fill, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
