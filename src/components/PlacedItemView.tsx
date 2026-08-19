import React, { useRef } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { CloseIcon } from '@/components/Icons';
import { TextCard } from '@/components/TextCard';
import { Thumb } from '@/components/Thumb';
import { useUserLibrary } from '@/context/UserLibraryContext';
import { sourceForItem, type LibraryItem } from '@/data/library';
import type { PlacedItem } from '@/types';
import { useTheme, useThemedStyles, type ThemeColors } from '@/theme';

export const STICKER_SIZE = 72;
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;

interface PlacedItemViewProps {
  item: PlacedItem;
  active: boolean;
  nickname: string;
  /** 사진 촬영 일시(epoch ms) — 타임스탬프 토큰 치환용. */
  takenAt?: number;
  /** 사용자 라이브러리에서 조회한 스티커 이미지/이름. */
  sticker?: LibraryItem;
  /** 캡처/결과 렌더 시 선택 UI(점선·핸들·삭제)를 숨긴다. */
  hideChrome?: boolean;
  /** 캔버스 좌상단의 화면 절대 좌표 (핸들 회전/스케일 계산용). */
  canvasOrigin: SharedValue<{ x: number; y: number }>;
  onActivate: (id: string) => void;
  onCommit: (id: string, patch: Partial<PlacedItem>) => void;
  onDelete: (id: string) => void;
  onToggleChoice: (id: string, lineKey: string, option: string) => void;
  onEditNote: (id: string, lineKey: string) => void;
}

/**
 * 캔버스에 배치된 항목 (이미지 스티커 또는 텍스트 카드).
 * - 본체 드래그로 이동
 * - 우하단 핸들 드래그로 회전 + 크기 동시 조절
 * - 좌상단 x 버튼으로 삭제
 * 텍스트 카드는 크기가 가변이라 onLayout으로 실제 크기를 측정해 회전 중심을 계산한다.
 */
export function PlacedItemView({
  item,
  active,
  nickname,
  takenAt,
  sticker,
  hideChrome = false,
  canvasOrigin,
  onActivate,
  onCommit,
  onDelete,
  onToggleChoice,
  onEditNote,
}: PlacedItemViewProps) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { getTemplate } = useUserLibrary();
  // 사용자 등록 템플릿은 컨텍스트에만 있으므로 모듈 직접 조회로는 찾을 수 없다.
  const template = item.kind === 'text' ? getTemplate(item.refId) : undefined;

  const tx = useSharedValue(item.x);
  const ty = useSharedValue(item.y);
  const sc = useSharedValue(item.scale);
  const rot = useSharedValue(item.rotation);

  // 측정된 본체 크기 (회전 중심 계산용). 기본값은 스티커 크기.
  const baseW = useSharedValue(STICKER_SIZE);
  const baseH = useSharedValue(STICKER_SIZE);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const startAngle = useSharedValue(0);
  const startDist = useSharedValue(1);
  const baseScale = useSharedValue(1);
  const baseRot = useSharedValue(0);

  // gesture-handler의 withRef/blocksExternalGesture용 ref (제네릭 타입 회피).
  const bodyRef = useRef<never>(undefined as never);

  const onLayout = (e: LayoutChangeEvent) => {
    baseW.value = e.nativeEvent.layout.width;
    baseH.value = e.nativeEvent.layout.height;
  };

  const bodyPan = Gesture.Pan()
    .withRef(bodyRef)
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
      runOnJS(onActivate)(item.id);
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      runOnJS(onCommit)(item.id, { x: tx.value, y: ty.value });
    });

  const handlePan = Gesture.Pan()
    .blocksExternalGesture(bodyRef)
    .onStart((e) => {
      const cx = canvasOrigin.value.x + tx.value + baseW.value / 2;
      const cy = canvasOrigin.value.y + ty.value + baseH.value / 2;
      startAngle.value = Math.atan2(e.absoluteY - cy, e.absoluteX - cx);
      startDist.value = Math.hypot(e.absoluteX - cx, e.absoluteY - cy) || 1;
      baseScale.value = sc.value;
      baseRot.value = rot.value;
    })
    .onUpdate((e) => {
      const cx = canvasOrigin.value.x + tx.value + baseW.value / 2;
      const cy = canvasOrigin.value.y + ty.value + baseH.value / 2;
      const angle = Math.atan2(e.absoluteY - cy, e.absoluteX - cx);
      const dist = Math.hypot(e.absoluteX - cx, e.absoluteY - cy) || 1;
      rot.value = baseRot.value + ((angle - startAngle.value) * 180) / Math.PI;
      const next = baseScale.value * (dist / startDist.value);
      sc.value = Math.max(MIN_SCALE, Math.min(MAX_SCALE, next));
    })
    .onEnd(() => {
      runOnJS(onCommit)(item.id, { scale: sc.value, rotation: rot.value });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { rotateZ: `${rot.value}deg` },
      { scale: sc.value },
    ],
  }));

  const showChrome = active && !hideChrome;

  return (
    <GestureDetector gesture={bodyPan}>
      <Animated.View style={[styles.container, animatedStyle]} onLayout={onLayout}>
        <View style={[showChrome && styles.active]}>
          {item.kind === 'sticker' ? (
            <Thumb
              source={sourceForItem(sticker)}
              emoji={sticker?.emoji}
              resizeMode="contain"
              borderRadius={8}
              tint="rgba(255,255,255,0.9)"
              style={styles.sticker}
            />
          ) : template ? (
            <TextCard
              template={template}
              nickname={nickname}
              takenAt={takenAt}
              choices={item.choices ?? {}}
              notes={item.notes ?? {}}
              editable={showChrome}
              onToggleChoice={(lineKey, option) => onToggleChoice(item.id, lineKey, option)}
              onEditNote={(lineKey) => onEditNote(item.id, lineKey)}
            />
          ) : null}
        </View>

        {showChrome ? (
          <>
            <GestureDetector gesture={handlePan}>
              <Animated.View style={styles.handle} hitSlop={10} />
            </GestureDetector>
            <Pressable style={styles.delete} hitSlop={10} onPress={() => onDelete(item.id)}>
              <CloseIcon color={colors.primaryDeep} />
            </Pressable>
          </>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  active: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
  },
  sticker: {
    width: STICKER_SIZE,
    height: STICKER_SIZE,
  },
  handle: {
    position: 'absolute',
    right: -11,
    bottom: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white,
  },
  delete: {
    position: 'absolute',
    left: -11,
    top: -11,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
