import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { findFrame } from '@/data/library';
import { fonts, radius, useThemedStyles, type ThemeColors } from '@/theme';

interface FrameOverlayProps {
  frameId: string | null;
  /** 결과 화면 등에서 라벨을 숨기고 싶을 때. */
  showLabel?: boolean;
}

/**
 * 프레임 모드 오버레이.
 * - 실제 프레임 PNG(source)가 있으면 캔버스를 덮는 이미지로 렌더.
 * - 없으면 디자인의 16px 핑크 보더로 렌더하고 하단에 프레임 이름 표시.
 */
export function FrameOverlay({ frameId, showLabel = true }: FrameOverlayProps) {
  const styles = useThemedStyles(makeStyles);
  const frame = frameId ? findFrame(frameId) : undefined;

  if (frame?.source) {
    return (
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Image source={frame.source} resizeMode="stretch" style={StyleSheet.absoluteFill} />
      </View>
    );
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={styles.border} />
      {showLabel && frame ? <Text style={styles.label}>{frame.label}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 16,
    borderColor: colors.primary,
    borderRadius: radius.canvas,
  },
  label: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.white,
    fontFamily: fonts.title,
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
});
