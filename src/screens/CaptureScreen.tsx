import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { ChevronLeft } from '@/components/Icons';
import { PillButton } from '@/components/PillButton';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import {
  fonts,
  spacing,
  useContentBounds,
  useResponsive,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';
import { pickImageFromLibrary } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export function CaptureScreen({ navigation }: Props) {
  const styles = useThemedStyles(makeStyles);
  const bounds = useContentBounds();
  const { width, height, isTablet } = useResponsive();
  // 프레임 가이드는 하드코딩 대신 화면 크기에 비례시켜 iPad에서도 구도가 맞게 한다.
  const guideInset = {
    left: Math.round(width * (isTablet ? 0.12 : 0.06)),
    right: Math.round(width * (isTablet ? 0.12 : 0.06)),
    top: Math.round(height * 0.11),
    bottom: Math.round(height * 0.17),
  };
  const { mode, setPhoto, clearPlacedItems } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const goEdit = () => {
    clearPlacedItems();
    navigation.navigate('Edit');
  };

  const handleCapture = async () => {
    if (!cameraRef.current || busy) return;
    try {
      setBusy(true);
      const result = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!result) return;
      setPhoto({ uri: result.uri, width: result.width, height: result.height });
      goEdit();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '촬영에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      setBusy(true);
      const photo = await pickImageFromLibrary();
      if (!photo) return;
      setPhoto(photo);
      goEdit();
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  if (!permission) {
    return <View style={styles.black} />;
  }

  if (!permission.granted) {
    return (
      <GradientBackground>
        <SafeAreaView style={[styles.permission, bounds]}>
          <Text style={styles.permissionText}>
            촬영을 위해 카메라 권한이 필요해요.{'\n'}권한 없이 갤러리에서 불러올 수도 있어요.
          </Text>
          <View style={styles.permissionButtons}>
            <PillButton label="카메라 권한 허용" onPress={requestPermission} />
            <PillButton
              label="갤러리에서 불러오기"
              variant="secondary"
              onPress={handlePickFromLibrary}
              loading={busy}
            />
          </View>
        </SafeAreaView>
      </GradientBackground>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing} />

      {/* 프레임 모드: 반투명 흰 테두리 가이드 */}
      {mode === 'frame' ? (
        <View pointerEvents="none" style={[styles.frameGuide, guideInset]} />
      ) : null}

      <SafeAreaView style={styles.topBar} edges={['top']}>
        <Pressable style={styles.roundBtn} onPress={() => navigation.goBack()}>
          <ChevronLeft color="#fff" size={18} />
        </Pressable>
      </SafeAreaView>

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <Pressable style={styles.side} onPress={handlePickFromLibrary} disabled={busy}>
          <Text style={styles.sideText}>갤러리</Text>
        </Pressable>

        <Pressable style={styles.shutter} onPress={handleCapture} disabled={busy}>
          <View style={styles.shutterInner} />
        </Pressable>

        <Pressable
          style={styles.side}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          disabled={busy}
        >
          <Text style={styles.sideText}>전환</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  black: {
    flex: 1,
    backgroundColor: '#111',
  },
  frameGuide: {
    // top/bottom/left/right는 화면 크기에 따라 런타임에 주입
    position: 'absolute',
    borderWidth: 10,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    padding: spacing.lg,
  },
  roundBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.xxl,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  side: {
    width: 64,
    alignItems: 'center',
  },
  sideText: {
    fontFamily: fonts.title,
    fontSize: 14,
    color: '#fff',
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#fff',
    borderWidth: 5,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  shutterInner: {
    flex: 1,
    borderRadius: 36,
    backgroundColor: '#fff',
  },
  permission: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xl,
  },
  permissionText: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButtons: {
    width: '100%',
    gap: spacing.md,
  },
});
