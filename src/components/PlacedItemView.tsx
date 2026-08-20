import React, { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { FrameOverlay } from '@/components/FrameOverlay';
import { CloseIcon } from '@/components/Icons';
import { TextCard } from '@/components/TextCard';
import { Thumb } from '@/components/Thumb';
import { useUserLibrary } from '@/context/UserLibraryContext';
import { sourceForItem, type LibraryItem } from '@/data/library';
import type { PlacedItem } from '@/types';
import { coverFraction, type Size } from '@/utils/layout';
import { fonts, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

/** 스티커 기본 한 변(pt) — 기준 캔버스 폭에서의 크기. */
export const STICKER_SIZE = 72;

/**
 * 배치 항목의 기본 크기를 정의하는 기준 캔버스 폭(pt).
 * 실제 캔버스가 이보다 넓으면 그 비율만큼 항목도 같이 커진다. 덕분에 iPad 처럼
 * 캔버스가 큰 화면에서도, 원본 해상도로 다시 그릴 때도 보이는 비중이 같다.
 */
export const REFERENCE_CANVAS_WIDTH = 360;

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
/** 프레임은 캔버스를 덮는 크기가 기본이라 축소 폭을 더 넓게 준다. */
const FRAME_MIN_SCALE = 0.3;
const FRAME_MAX_SCALE = 3;

/** 프레임 조작 UI를 캔버스 모서리에서 얼마나 들여 놓을지(pt). */
const FRAME_CHROME_INSET = 12;

interface PlacedItemViewProps {
  item: PlacedItem;
  active: boolean;
  nickname: string;
  /** 사진 촬영 일시(epoch ms) — 타임스탬프 토큰 치환용. */
  takenAt?: number;
  /** 사용자 라이브러리에서 조회한 스티커 이미지/이름. */
  sticker?: LibraryItem;
  /** 사용자 라이브러리에서 조회한 프레임 이미지/이름. */
  frame?: LibraryItem;
  /** 프레임 이미지의 원본 가로세로비. 모르면 캔버스 비율로 간주한다. */
  frameAspect?: number | null;
  /** 캡처/결과 렌더 시 선택 UI(점선·핸들·삭제)를 숨긴다. */
  hideChrome?: boolean;
  /** 캔버스 크기(pt). 배치 좌표와 기본 크기의 기준. */
  canvasWidth: number;
  canvasHeight: number;
  /** 제스처 계산용 캔버스 크기 (레이아웃 값과 같은 값을 UI 스레드에서 읽는다). */
  canvasSize: SharedValue<Size>;
  /** 캔버스 좌상단의 화면 절대 좌표 (핸들 회전/스케일 계산용). */
  canvasOrigin: SharedValue<{ x: number; y: number }>;
  onActivate: (id: string | null) => void;
  onCommit: (id: string, patch: Partial<PlacedItem>) => void;
  onDelete: (id: string) => void;
  /** 프레임 전용 — 위치·크기·회전을 처음 상태로 되돌린다. */
  onReset?: (id: string) => void;
  onToggleChoice: (id: string, lineKey: string, option: string) => void;
  onEditNote: (id: string, lineKey: string) => void;
}

/**
 * 캔버스에 배치된 항목 (프레임 / 이미지 스티커 / 텍스트 카드).
 * - 본체 드래그로 이동
 * - 우하단 핸들 드래그로 회전 + 크기 동시 조절
 * - 좌상단 x 버튼으로 삭제 (프레임은 삭제 대신 '원래대로')
 *
 * 위치는 캔버스 대비 비율로 다루므로 캔버스 크기가 달라져도 배치가 유지된다.
 * 텍스트 카드는 크기가 가변이라 onLayout으로 실제 크기를 측정해 회전 중심을 계산한다.
 */
export function PlacedItemView({
  item,
  active,
  nickname,
  takenAt,
  sticker,
  frame,
  frameAspect,
  hideChrome = false,
  canvasWidth,
  canvasHeight,
  canvasSize,
  canvasOrigin,
  onActivate,
  onCommit,
  onDelete,
  onReset,
  onToggleChoice,
  onEditNote,
}: PlacedItemViewProps) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { getTemplate } = useUserLibrary();
  // 사용자 등록 템플릿은 컨텍스트에만 있으므로 모듈 직접 조회로는 찾을 수 없다.
  const template = item.kind === 'text' ? getTemplate(item.refId) : undefined;

  const isFrame = item.kind === 'frame';
  const sizeScale = canvasWidth > 0 ? canvasWidth / REFERENCE_CANVAS_WIDTH : 1;
  const canvasAspect = canvasHeight > 0 ? canvasWidth / canvasHeight : 1;
  const minScale = isFrame ? FRAME_MIN_SCALE : MIN_SCALE;
  const maxScale = isFrame ? FRAME_MAX_SCALE : MAX_SCALE;

  /** 프레임 본체 박스 — 캔버스를 덮는 크기를 원본 비율 그대로 잡는다. */
  const frameBox = useMemo<Size | null>(() => {
    if (!isFrame) return null;
    const fraction = coverFraction(canvasAspect, frameAspect || canvasAspect);
    return { width: canvasWidth * fraction.width, height: canvasHeight * fraction.height };
  }, [isFrame, canvasAspect, frameAspect, canvasWidth, canvasHeight]);

  // 위치·배율은 캔버스 대비 비율. 제스처 중에는 UI 스레드에서만 갱신하고 끝날 때 커밋한다.
  const nx = useSharedValue(item.x);
  const ny = useSharedValue(item.y);
  const sc = useSharedValue(item.scale);
  const rot = useSharedValue(item.rotation);

  // 측정된 본체 크기 (회전 중심 계산용). 기본값은 기준 캔버스에서의 스티커 크기.
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

  // '원래대로'처럼 밖에서 값을 바꾼 경우를 따라간다. 제스처가 커밋한 값이 되돌아온
  // 경우에는 같은 값을 다시 쓰는 것이라 화면에 아무 변화가 없다.
  useEffect(() => {
    nx.value = item.x;
    ny.value = item.y;
    sc.value = item.scale;
    rot.value = item.rotation;
  }, [item.x, item.y, item.scale, item.rotation, nx, ny, sc, rot]);

  const onLayout = (e: LayoutChangeEvent) => {
    baseW.value = e.nativeEvent.layout.width;
    baseH.value = e.nativeEvent.layout.height;
  };

  const bodyPan = Gesture.Pan()
    .withRef(bodyRef)
    .onStart(() => {
      startX.value = nx.value;
      startY.value = ny.value;
      runOnJS(onActivate)(item.id);
    })
    .onUpdate((e) => {
      const { width, height } = canvasSize.value;
      if (width <= 0 || height <= 0) return;
      nx.value = startX.value + e.translationX / width;
      ny.value = startY.value + e.translationY / height;
    })
    .onEnd(() => {
      runOnJS(onCommit)(item.id, { x: nx.value, y: ny.value });
    });

  /**
   * 프레임은 캔버스를 통째로 덮어 배경 탭이 닿지 않는다.
   * 탭으로 선택/해제할 수 있게 해줘야 조작 UI를 띄우고 닫을 수 있다.
   */
  const bodyTap = Gesture.Tap().onEnd(() => {
    runOnJS(onActivate)(active ? null : item.id);
  });

  const bodyGesture = isFrame ? Gesture.Exclusive(bodyPan, bodyTap) : bodyPan;

  const handlePan = Gesture.Pan()
    .blocksExternalGesture(bodyRef)
    .onStart((e) => {
      const { width, height } = canvasSize.value;
      const cx = canvasOrigin.value.x + nx.value * width + baseW.value / 2;
      const cy = canvasOrigin.value.y + ny.value * height + baseH.value / 2;
      startAngle.value = Math.atan2(e.absoluteY - cy, e.absoluteX - cx);
      startDist.value = Math.hypot(e.absoluteX - cx, e.absoluteY - cy) || 1;
      baseScale.value = sc.value;
      baseRot.value = rot.value;
    })
    .onUpdate((e) => {
      const { width, height } = canvasSize.value;
      const cx = canvasOrigin.value.x + nx.value * width + baseW.value / 2;
      const cy = canvasOrigin.value.y + ny.value * height + baseH.value / 2;
      const angle = Math.atan2(e.absoluteY - cy, e.absoluteX - cx);
      const dist = Math.hypot(e.absoluteX - cx, e.absoluteY - cy) || 1;
      rot.value = baseRot.value + ((angle - startAngle.value) * 180) / Math.PI;
      const next = baseScale.value * (dist / startDist.value);
      sc.value = Math.max(minScale, Math.min(maxScale, next));
    })
    .onEnd(() => {
      runOnJS(onCommit)(item.id, { scale: sc.value, rotation: rot.value });
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: nx.value * canvasSize.value.width },
      { translateY: ny.value * canvasSize.value.height },
      { rotateZ: `${rot.value}deg` },
      { scale: sc.value },
    ],
  }));

  const showChrome = active && !hideChrome;

  return (
    <>
      <GestureDetector gesture={bodyGesture}>
        <Animated.View style={[styles.container, frameBox, animatedStyle]} onLayout={onLayout}>
          {/* 프레임만 부모(본체 박스)를 꽉 채운다. 스티커·텍스트는 내용 크기 그대로다. */}
          <View style={[isFrame && styles.fill, showChrome && !isFrame && styles.active]}>
            {isFrame ? (
              <FrameOverlay frame={frame} sizeScale={sizeScale} showLabel={!hideChrome} />
            ) : item.kind === 'sticker' ? (
              <Thumb
                source={sourceForItem(sticker)}
                emoji={sticker?.emoji}
                resizeMode="contain"
                borderRadius={8 * sizeScale}
                tint="rgba(255,255,255,0.9)"
                style={{ width: STICKER_SIZE * sizeScale, height: STICKER_SIZE * sizeScale }}
              />
            ) : template ? (
              <TextCard
                template={template}
                nickname={nickname}
                takenAt={takenAt}
                choices={item.choices ?? {}}
                notes={item.notes ?? {}}
                editable={showChrome}
                sizeScale={sizeScale}
                onToggleChoice={(lineKey, option) => onToggleChoice(item.id, lineKey, option)}
                onEditNote={(lineKey) => onEditNote(item.id, lineKey)}
              />
            ) : null}
          </View>

          {showChrome && !isFrame ? (
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

      {/*
        프레임은 조작 UI를 본체가 아니라 캔버스 모서리에 붙인다.
        본체는 캔버스보다 크고 밖으로 끌어낼 수도 있어, 본체에 붙이면
        핸들과 '원래대로'가 화면 밖으로 나가 잡을 수 없게 된다.
      */}
      {showChrome && isFrame ? (
        <View style={styles.frameChrome} pointerEvents="box-none">
          <Pressable
            style={styles.frameReset}
            hitSlop={8}
            accessibilityRole="button"
            onPress={() => onReset?.(item.id)}
          >
            <Text style={styles.frameResetLabel}>원래대로</Text>
          </Pressable>
          <GestureDetector gesture={handlePan}>
            <Animated.View style={[styles.handle, styles.frameHandle]} hitSlop={12} />
          </GestureDetector>
        </View>
      ) : null}
    </>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  active: {
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: 10,
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
  frameChrome: {
    ...StyleSheet.absoluteFillObject,
  },
  frameHandle: {
    right: FRAME_CHROME_INSET,
    bottom: FRAME_CHROME_INSET,
    width: 26,
    height: 26,
    borderRadius: 13,
  },
  frameReset: {
    position: 'absolute',
    left: FRAME_CHROME_INSET,
    top: FRAME_CHROME_INSET,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    borderWidth: 1,
    borderColor: colors.border,
  },
  frameResetLabel: {
    fontFamily: fonts.title,
    fontSize: 12,
    color: colors.primaryDeep,
  },
});
