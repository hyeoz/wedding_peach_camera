import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import type { OverlayAsset } from '@/types';
import { colors, radius, spacing } from '@/theme';

interface OverlayThumbnailProps {
  asset: OverlayAsset;
  selected?: boolean;
  onPress: () => void;
  onLongPress?: () => void;
}

/** 즐겨찾기 그리드에 표시되는 프레임/스티커 썸네일. */
export function OverlayThumbnail({
  asset,
  selected = false,
  onPress,
  onLongPress,
}: OverlayThumbnailProps) {
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.container, selected && styles.selected]}
    >
      <Image source={{ uri: asset.uri }} style={styles.image} resizeMode="contain" />
      {asset.name ? (
        <Text numberOfLines={1} style={styles.name}>
          {asset.name}
        </Text>
      ) : null}
      {selected ? (
        <View style={styles.check}>
          <Text style={styles.checkMark}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    padding: spacing.xs,
  },
  selected: {
    borderColor: colors.primary,
  },
  image: {
    flex: 1,
    width: '100%',
  },
  name: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    paddingTop: 2,
  },
  check: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 22,
    height: 22,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
});
