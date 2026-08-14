import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DownloadIcon, RefreshIcon, ShareIcon } from '@/components/Icons';
import { GradientBackground } from '@/components/GradientBackground';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import { fonts, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { saveToGallery, shareImage } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export function ResultScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { resultUri } = useSession();
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 1800);
  };

  const handleSave = async () => {
    if (!resultUri) return;
    try {
      setSaving(true);
      await saveToGallery(resultUri);
      showToast('저장되었습니다');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    if (!resultUri) return;
    try {
      await shareImage(resultUri);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '공유에 실패했습니다.');
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <Text style={styles.title}>완성됐어요!</Text>

        <View style={styles.preview}>
          {resultUri ? (
            <Image source={{ uri: resultUri }} style={styles.image} resizeMode="contain" />
          ) : null}
        </View>

        <Text style={styles.toast}>{toast}</Text>

        <View style={styles.row}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
          >
            <DownloadIcon />
            <Text style={styles.btnPrimaryLabel}>저장</Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && styles.pressed]}
          >
            <ShareIcon color={colors.text} />
            <Text style={styles.btnOutlineLabel}>공유</Text>
          </Pressable>
        </View>

        <Pressable style={styles.retake} onPress={() => navigation.navigate('Source')}>
          <RefreshIcon color={colors.primaryDeep} />
          <Text style={styles.retakeLabel}>바로 다시 촬영</Text>
        </Pressable>
      </SafeAreaView>
    </GradientBackground>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    paddingBottom: spacing.md,
  },
  preview: {
    flex: 1,
    borderRadius: radius.canvas,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  toast: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.primaryDeep,
    textAlign: 'center',
    height: 18,
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryLabel: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.white,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  btnOutlineLabel: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
  retake: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  retakeLabel: {
    fontFamily: fonts.title,
    fontSize: 14,
    color: colors.primaryDeep,
  },
});
