import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ChevronLeft } from '@/components/Icons';
import { colors, fonts, spacing } from '@/theme';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  /** 뒤로가기 우측 균형용 여백 (제목 가운데 정렬이 필요할 때). */
  centered?: boolean;
  right?: React.ReactNode;
}

/** 뒤로가기 + 타이틀로 구성된 상단 바. */
export function TopBar({ title, onBack, centered = false, right }: TopBarProps) {
  return (
    <View style={styles.row}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={8} style={styles.back}>
          <ChevronLeft />
        </Pressable>
      ) : (
        <View style={styles.spacer} />
      )}
      <Text style={[styles.title, centered && styles.titleCentered]}>{title}</Text>
      {centered ? right ?? <View style={styles.spacer} /> : right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: {
    padding: 6,
  },
  spacer: {
    width: 32,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: colors.text,
  },
  titleCentered: {
    flex: 1,
    textAlign: 'center',
  },
});
