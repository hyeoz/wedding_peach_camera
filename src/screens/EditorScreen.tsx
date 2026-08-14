import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type ViewShot from 'react-native-view-shot';

import { Button } from '@/components/Button';
import { CompositeCanvas } from '@/components/CompositeCanvas';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import { colors, spacing } from '@/theme';
import { saveToGallery } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;

export function EditorScreen({ navigation }: Props) {
  const { photo, overlay, reset } = useSession();
  const shotRef = useRef<ViewShot>(null);
  const [saving, setSaving] = useState(false);

  // 방어 코드: 세션이 비어 있으면 홈으로.
  if (!photo || !overlay) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.hint}>편집할 사진 또는 오버레이가 없어요.</Text>
        <Button label="처음으로" onPress={() => navigation.popToTop()} />
      </SafeAreaView>
    );
  }

  const handleSave = async () => {
    if (!shotRef.current?.capture) return;
    try {
      setSaving(true);
      const uri = await shotRef.current.capture();
      await saveToGallery(uri);
      Alert.alert('저장 완료', '갤러리에 저장했어요.', [
        {
          text: '처음으로',
          onPress: () => {
            reset();
            navigation.popToTop();
          },
        },
        { text: '계속', style: 'cancel' },
      ]);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.canvasWrap}>
        <CompositeCanvas ref={shotRef} photo={photo} overlay={overlay} />
        {overlay.mode === 'sticker' ? (
          <Text style={styles.tip}>스티커를 드래그·핀치·회전해 위치를 조정하세요.</Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <Button
          label="다시 촬영"
          variant="secondary"
          onPress={() => navigation.goBack()}
          style={styles.flex1}
        />
        <Button label="저장" onPress={handleSave} loading={saving} style={styles.flex1} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  canvasWrap: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
    gap: spacing.md,
  },
  tip: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  flex1: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  hint: {
    fontSize: 15,
    color: colors.textMuted,
  },
});
