import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChevronLeft } from '@/components/Icons';
import { PillButton } from '@/components/PillButton';
import type { RootStackParamList } from '@/navigation/types';
import { fonts, spacing } from '@/theme';
import { saveToGallery } from '@/utils/media';
import { clampCameraZoom, formatRecordingTime } from '@/utils/video';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoCapture'>;

export function VideoCaptureScreen({ navigation }: Props) {
  const isFocused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const pinchStartZoom = useRef(0);
  const zoomRef = useRef(0);
  const startedAt = useRef(0);

  const [cameraReady, setCameraReady] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [zoom, setZoomState] = useState(0);
  const [recording, setRecording] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [saving, setSaving] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');

  const setZoom = (next: number) => {
    const clamped = clampCameraZoom(next);
    zoomRef.current = clamped;
    setZoomState(clamped);
  };

  const pinchGesture = useMemo(
    () =>
      Gesture.Pinch()
        .runOnJS(true)
        .onBegin(() => {
          pinchStartZoom.current = zoomRef.current;
        })
        .onUpdate(({ scale }) => {
          // 로그 배율을 쓰면 확대·축소 손가락 움직임이 대칭이고 급격히 튀지 않는다.
          setZoom(pinchStartZoom.current + Math.log2(scale) * 0.16);
        }),
    [],
  );

  useEffect(() => {
    if (!recording) return;
    const update = () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000));
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(''), 2200);
    return () => clearTimeout(timer);
  }, [message]);

  const startRecording = async () => {
    if (!cameraRef.current || !cameraReady || recording || saving) return;

    setMessage('');
    setElapsed(0);
    startedAt.current = Date.now();
    setRecording(true);

    try {
      // CameraView의 mute가 오디오 입력 자체를 제외한다. 반환된 원본 파일을 재인코딩하지 않는다.
      const result = await cameraRef.current.recordAsync();
      if (!result?.uri) throw new Error('촬영한 영상을 찾지 못했습니다.');

      setSaving(true);
      await saveToGallery(result.uri);
      setMessage('무음 동영상을 저장했어요');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '동영상 촬영에 실패했습니다.');
    } finally {
      setRecording(false);
      setStopping(false);
      setSaving(false);
    }
  };

  const stopRecording = () => {
    if (!cameraRef.current || !recording || stopping) return;
    setStopping(true);
    cameraRef.current.stopRecording();
  };

  const handleShutter = () => {
    if (recording) stopRecording();
    else void startRecording();
  };

  const handleBack = () => {
    if (recording || saving) {
      setMessage(recording ? '촬영을 중지한 뒤 돌아가 주세요' : '영상을 저장하고 있어요');
      return;
    }
    navigation.goBack();
  };

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <View style={styles.permission}>
        <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
        <Text style={styles.permissionText}>무음 동영상을 촬영하려면 카메라 접근을 허용해 주세요.</Text>
        <PillButton label="카메라 권한 허용" onPress={requestPermission} />
        <PillButton label="돌아가기" variant="secondary" onPress={() => navigation.goBack()} />
      </View>
    );
  }

  return (
    <View style={styles.black}>
      <GestureDetector gesture={pinchGesture}>
        <View style={StyleSheet.absoluteFill}>
          <CameraView
            // iOS는 facing 변경만으로 onCameraReady를 다시 보내지 않는다.
            // 새 카메라 세션을 마운트해 전환 후 준비 이벤트를 다시 받는다.
            key={facing}
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            active={isFocused}
            facing={facing}
            mode="video"
            mute
            zoom={zoom}
            videoQuality="2160p"
            videoStabilizationMode="auto"
            responsiveOrientationWhenOrientationLocked
            onCameraReady={() => setCameraReady(true)}
            onMountError={({ message: errorMessage }) => setMessage(errorMessage)}
          />
        </View>
      </GestureDetector>

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <Pressable style={styles.roundButton} onPress={handleBack} accessibilityLabel="돌아가기">
          <ChevronLeft color="#fff" size={20} />
        </Pressable>

        <View style={[styles.statusPill, recording && styles.recordingPill]}>
          {recording ? <View style={styles.recordingDot} /> : null}
          <Text style={styles.statusText}>
            {recording ? formatRecordingTime(elapsed) : '무음 · 4K'}
          </Text>
        </View>

        <View style={styles.topSpacer} />
      </SafeAreaView>

      {!recording && !saving ? (
        <View pointerEvents="none" style={styles.zoomHint}>
          <Text style={styles.zoomHintText}>두 손가락으로 확대 · 축소</Text>
        </View>
      ) : null}

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <Pressable
          style={styles.sideButton}
          onPress={() => setZoom(0)}
          disabled={recording || saving}
          accessibilityLabel="확대 초기화"
        >
          <View style={styles.zoomReset}>
            <Text style={styles.zoomResetText}>1×</Text>
          </View>
        </Pressable>

        <Pressable
          style={[styles.shutter, recording && styles.shutterRecording]}
          onPress={handleShutter}
          disabled={!cameraReady || saving || stopping}
          accessibilityLabel={recording ? '촬영 중지' : '동영상 촬영 시작'}
        >
          {saving || stopping ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <View style={[styles.shutterInner, recording && styles.stopInner]} />
          )}
        </Pressable>

        <Pressable
          style={styles.sideButton}
          onPress={() => {
            setCameraReady(false);
            setZoom(0);
            setFacing((current) => (current === 'back' ? 'front' : 'back'));
          }}
          disabled={!cameraReady || recording || saving || stopping}
          accessibilityLabel="전후면 카메라 전환"
        >
          <Text style={styles.sideButtonText}>전환</Text>
        </Pressable>
      </SafeAreaView>

      {message ? (
        <View pointerEvents="none" style={styles.toast}>
          <Text style={styles.toastText}>{message}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  black: {
    flex: 1,
    backgroundColor: '#090909',
  },
  permission: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
    backgroundColor: '#f8eff7',
  },
  permissionTitle: {
    fontFamily: fonts.title,
    fontSize: 22,
    color: '#3a1030',
    textAlign: 'center',
  },
  permissionText: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
    color: '#76566d',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSpacer: {
    width: 42,
  },
  statusPill: {
    minWidth: 96,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.48)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  recordingPill: {
    backgroundColor: 'rgba(0,0,0,0.68)',
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ff3b30',
  },
  statusText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: '#fff',
    fontVariant: ['tabular-nums'],
  },
  zoomHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 164,
    alignItems: 'center',
  },
  zoomHintText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: '#fff',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 138,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(0,0,0,0.34)',
  },
  sideButton: {
    width: 58,
    height: 58,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonText: {
    fontFamily: fonts.title,
    fontSize: 14,
    color: '#fff',
  },
  zoomReset: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomResetText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: '#fff',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  shutterRecording: {
    borderColor: 'rgba(255,255,255,0.75)',
  },
  shutterInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#ff3b30',
  },
  stopInner: {
    width: 29,
    height: 29,
    borderRadius: 6,
  },
  toast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 158,
    alignItems: 'center',
  },
  toastText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    lineHeight: 19,
    color: '#fff',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.74)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 9,
    overflow: 'hidden',
  },
});
