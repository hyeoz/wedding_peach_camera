import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import { colors, radius, spacing } from '@/theme';
import { pickImageFromLibrary } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Capture'>;

export function CaptureScreen({ navigation }: Props) {
  const { setPhoto } = useSession();
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [busy, setBusy] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  /** 셔터: 사진을 찍고 편집 화면으로 이동. */
  const handleCapture = async () => {
    if (!cameraRef.current || busy) return;
    try {
      setBusy(true);
      const result = await cameraRef.current.takePictureAsync({ quality: 1 });
      if (!result) return;
      setPhoto({ uri: result.uri, width: result.width, height: result.height });
      navigation.navigate('Editor');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '촬영에 실패했습니다.');
    } finally {
      setBusy(false);
    }
  };

  /** 갤러리에서 사진을 불러와 편집 화면으로 이동. */
  const handlePickFromLibrary = async () => {
    try {
      setBusy(true);
      const photo = await pickImageFromLibrary();
      if (!photo) return;
      setPhoto(photo);
      navigation.navigate('Editor');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
    } finally {
      setBusy(false);
    }
  };

  // 권한 로딩 중.
  if (!permission) {
    return <SafeAreaView style={styles.container} />;
  }

  // 권한 미허용: 요청 UI + 갤러리 대안.
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer} edges={['bottom']}>
        <Text style={styles.permissionText}>
          촬영을 위해 카메라 권한이 필요해요.{'\n'}권한 없이 갤러리에서 불러올 수도 있어요.
        </Text>
        <View style={styles.permissionButtons}>
          <Button label="카메라 권한 허용" onPress={requestPermission} />
          <Button
            label="갤러리에서 불러오기"
            variant="secondary"
            onPress={handlePickFromLibrary}
            loading={busy}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

      <SafeAreaView style={styles.controls} edges={['bottom']}>
        <Pressable
          style={styles.sideButton}
          onPress={handlePickFromLibrary}
          disabled={busy}
        >
          <Text style={styles.sideButtonText}>갤러리</Text>
        </Pressable>

        <Pressable style={styles.shutter} onPress={handleCapture} disabled={busy}>
          <View style={styles.shutterInner} />
        </Pressable>

        <Pressable
          style={styles.sideButton}
          onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
          disabled={busy}
        >
          <Text style={styles.sideButtonText}>전환</Text>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sideButton: {
    width: 64,
    height: 64,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: '#fff',
  },
  permissionContainer: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  permissionText: {
    fontSize: 16,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
  },
  permissionButtons: {
    width: '100%',
    gap: spacing.sm,
  },
});
