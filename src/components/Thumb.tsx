import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, fonts, radius } from '@/theme';

interface ThumbProps {
  source?: ImageSourcePropType;
  /** source가 없을 때 플레이스홀더에 표시할 이모지. */
  emoji?: string;
  /** 플레이스홀더 하단 라벨 (선택). */
  label?: string;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  /** 이미지 렌더 방식. 스티커=contain, 사진/프레임=cover. */
  resizeMode?: 'cover' | 'contain';
  /** 플레이스홀더 배경 틴트. */
  tint?: string;
}

/**
 * 디자인의 image-slot 대응 컴포넌트.
 * 실제 이미지가 있으면 표시하고, 없으면 이모지 + 라벨 플레이스홀더를 그린다.
 */
export function Thumb({
  source,
  emoji = '🖼️',
  label,
  borderRadius = radius.thumb,
  style,
  resizeMode = 'contain',
  tint = colors.tintPink,
}: ThumbProps) {
  if (source) {
    return (
      <Image source={source} resizeMode={resizeMode} style={[{ borderRadius }, style] as never} />
    );
  }
  return (
    <View style={[styles.placeholder, { borderRadius, backgroundColor: tint }, style]}>
      <Text style={styles.emoji}>{emoji}</Text>
      {label ? (
        <Text numberOfLines={1} style={styles.label}>
          {label}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    padding: 4,
  },
  emoji: {
    fontSize: 26,
  },
  label: {
    fontFamily: fonts.body,
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },
});
