import React, { forwardRef } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import ViewShot from 'react-native-view-shot';

import { DraggableSticker } from '@/components/DraggableSticker';
import type { OverlayAsset, Photo } from '@/types';
import { colors } from '@/theme';

interface CompositeCanvasProps {
  photo: Photo;
  overlay: OverlayAsset;
}

/**
 * 사진 + 오버레이를 합성해 보여주는 캔버스.
 * ViewShot ref를 통해 이 영역을 그대로 이미지로 캡처할 수 있다.
 *
 * - frame 모드: 사진을 캔버스에 꽉 채우고(cover) 프레임 이미지를 그 위에 덮는다.
 *   프레임 이미지의 가운데가 투명하면 사진이 중앙 영역으로 비쳐 보인다.
 * - sticker 모드: 사진을 채우고 그 위에 드래그 가능한 스티커를 올린다.
 */
export const CompositeCanvas = forwardRef<ViewShot, CompositeCanvasProps>(
  ({ photo, overlay }, ref) => {
    // 프레임 비율이 있으면 캔버스 비율로 사용, 없으면 정사각.
    const aspectRatio = overlay.mode === 'frame' && overlay.aspectRatio ? overlay.aspectRatio : 1;

    return (
      <ViewShot ref={ref} options={{ format: 'png', quality: 1 }} style={styles.shot}>
        <View style={[styles.canvas, { aspectRatio }]}>
          <Image source={{ uri: photo.uri }} style={styles.photo} resizeMode="cover" />

          {overlay.mode === 'frame' ? (
            <Image source={{ uri: overlay.uri }} style={styles.frame} resizeMode="contain" />
          ) : (
            <DraggableSticker uri={overlay.uri} />
          )}
        </View>
      </ViewShot>
    );
  },
);

CompositeCanvas.displayName = 'CompositeCanvas';

const styles = StyleSheet.create({
  shot: {
    backgroundColor: colors.background,
  },
  canvas: {
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
    position: 'relative',
  },
  photo: {
    ...StyleSheet.absoluteFillObject,
  },
  frame: {
    ...StyleSheet.absoluteFillObject,
  },
});
