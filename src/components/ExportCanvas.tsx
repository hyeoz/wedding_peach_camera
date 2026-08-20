import React, { useEffect, useRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';

import { PlacedItemView } from '@/components/PlacedItemView';
import type { LibraryItem } from '@/data/library';
import type { PlacedItem, Photo } from '@/types';
import type { Size } from '@/utils/layout';
import { useTheme } from '@/theme';

/** 사진이 올라온 뒤 스티커·프레임 이미지가 큰 크기로 다시 디코딩될 시간을 준다. */
const SETTLE_MS = 400;
/** onLoad 가 오지 않는 경우를 대비한 상한. 여기까지 기다리면 그냥 캡처한다. */
const MAX_WAIT_MS = 2500;

interface ExportCanvasProps {
  photo: Photo;
  items: PlacedItem[];
  /** 캔버스 크기(pt). 화면 배율을 곱한 값이 결과 이미지의 픽셀 크기가 된다. */
  width: number;
  height: number;
  nickname: string;
  frame?: LibraryItem;
  frameAspect?: number | null;
  getSticker: (refId: string) => LibraryItem | undefined;
  /** 캡처 대상이 될 뷰. */
  captureRef: React.RefObject<View | null>;
  /** 캡처해도 되는 상태가 되면 호출된다. */
  onReady: () => void;
}

const noop = () => {};

/**
 * 저장용 원본 해상도 캔버스.
 *
 * 화면에 보이는 캔버스를 그대로 캡처하면 결과 해상도가 "캔버스 pt × 화면 배율"에
 * 묶여 1000px 대로 깎인다. 그래서 사진 원본 크기(pt = px / 화면 배율)로 같은 트리를
 * 한 번 더 그린 뒤 그쪽을 캡처한다. 배치 좌표가 캔버스 대비 비율이고 텍스트 카드·
 * 스티커도 캔버스 폭에 비례해 커지므로, 여기서는 크기만 바꿔 끼우면 된다.
 *
 * 화면 밖으로 밀어내는 대신 좌상단에 그대로 두고 위를 불투명 오버레이로 덮는다.
 * 창 안에 있는 뷰라야 캡처가 안정적이다.
 */
export function ExportCanvas({
  photo,
  items,
  width,
  height,
  nickname,
  frame,
  frameAspect,
  getSticker,
  captureRef,
  onReady,
}: ExportCanvasProps) {
  const colors = useTheme();
  const canvasSize = useSharedValue<Size>({ width, height });
  const canvasOrigin = useSharedValue({ x: 0, y: 0 });

  const fired = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    canvasSize.value = { width, height };
  }, [width, height, canvasSize]);

  useEffect(() => {
    const pending = timers.current;
    return () => {
      pending.forEach(clearTimeout);
      pending.length = 0;
    };
  }, []);

  useEffect(() => {
    const fire = () => {
      if (fired.current) return;
      fired.current = true;
      onReady();
    };
    timers.current.push(setTimeout(fire, MAX_WAIT_MS));
  }, [onReady]);

  const handlePhotoLoad = () => {
    timers.current.push(
      setTimeout(() => {
        if (fired.current) return;
        fired.current = true;
        onReady();
      }, SETTLE_MS),
    );
  };

  return (
    <View style={[styles.offscreen, { width, height }]} pointerEvents="none">
      <View
        ref={captureRef}
        collapsable={false}
        style={[styles.canvas, { width, height, backgroundColor: colors.canvas }]}
      >
        <Image
          source={{ uri: photo.uri }}
          resizeMode="cover"
          style={StyleSheet.absoluteFill}
          onLoad={handlePhotoLoad}
        />

        {items.map((item) => (
          <PlacedItemView
            key={item.id}
            item={item}
            active={false}
            hideChrome
            nickname={nickname}
            takenAt={photo.takenAt}
            sticker={item.kind === 'sticker' ? getSticker(item.refId) : undefined}
            frame={item.kind === 'frame' ? frame : undefined}
            frameAspect={frameAspect}
            canvasWidth={width}
            canvasHeight={height}
            canvasSize={canvasSize}
            canvasOrigin={canvasOrigin}
            onActivate={noop}
            onCommit={noop}
            onDelete={noop}
            onToggleChoice={noop}
            onEditNote={noop}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  offscreen: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  canvas: {
    overflow: 'hidden',
  },
});
