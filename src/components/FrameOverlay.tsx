import React, { useMemo } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { sourceForItem, type LibraryItem } from '@/data/library';
import { fonts, radius, useTheme, type ThemeColors } from '@/theme';

interface FrameOverlayProps {
  frame?: LibraryItem;
  /**
   * 프레임 박스 배율. 테두리 폴백처럼 pt 로 고정된 치수에 곱해,
   * 원본 해상도로 합성할 때도 화면과 같은 비율로 보이게 한다.
   */
  sizeScale?: number;
  /** 결과 화면 등에서 라벨을 숨기고 싶을 때. */
  showLabel?: boolean;
}

/**
 * 프레임 그림 자체.
 *
 * 부모(PlacedItemView)가 프레임 이미지의 원본 비율에 맞춘 박스를 잡아주므로
 * 여기서는 그 박스를 `contain` 으로 채우기만 한다. 늘려서 채우지 않기 때문에
 * 어떤 비율의 사진 위에 올려도 프레임이 찌그러지지 않는다.
 *
 * 이미지가 없는 항목은 디자인의 핑크 보더 + 이름 라벨로 대신 그린다.
 */
export function FrameOverlay({ frame, sizeScale = 1, showLabel = true }: FrameOverlayProps) {
  const colors = useTheme();
  const styles = useMemo(() => makeStyles(colors, sizeScale), [colors, sizeScale]);
  const source = sourceForItem(frame);

  if (source) {
    return <Image source={source} resizeMode="contain" style={styles.fill} />;
  }

  return (
    <View style={styles.fill}>
      <View style={styles.border} />
      {showLabel && frame ? <Text style={styles.label}>{frame.label}</Text> : null}
    </View>
  );
}

const makeStyles = (colors: ThemeColors, s: number) =>
  StyleSheet.create({
  fill: {
    width: '100%',
    height: '100%',
  },
  border: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 16 * s,
    borderColor: colors.primary,
    borderRadius: radius.canvas * s,
  },
  label: {
    position: 'absolute',
    bottom: 10 * s,
    left: 0,
    right: 0,
    textAlign: 'center',
    color: colors.white,
    fontFamily: fonts.title,
    fontSize: 13 * s,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 * s },
    textShadowRadius: 3 * s,
  },
});
