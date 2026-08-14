import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { CameraIcon, ImageIcon } from '@/components/Icons';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/context/SessionContext';
import { useUserLibrary } from '@/context/UserLibraryContext';
import { modeLabel } from '@/data/library';
import type { RootStackParamList } from '@/navigation/types';
import { fonts, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Source'>;

export function SourceScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { mode, selectedFrameId, selectedItemIds } = useSession();
  const { getItem } = useUserLibrary();

  const summary =
    mode === 'frame'
      ? getItem('frame', selectedFrameId ?? '')?.label ?? '-'
      : selectedItemIds
          .map((id) => getItem(mode, id)?.label)
          .filter(Boolean)
          .join(', ') || '-';

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TopBar title="사진 가져오기" onBack={() => navigation.goBack()} />

        <View style={styles.body}>
          <Text style={styles.summary}>
            선택한 {modeLabel(mode)}: <Text style={styles.summaryValue}>{summary}</Text>
          </Text>

          <View style={styles.buttons}>
            <Pressable
              onPress={() => navigation.navigate('Capture')}
              style={({ pressed }) => [styles.btn, { backgroundColor: colors.primary }, pressed && styles.pressed]}
            >
              <CameraIcon />
              <Text style={styles.btnLabel}>촬영하기</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('Gallery')}
              style={({ pressed }) => [styles.btn, { backgroundColor: colors.secondary }, pressed && styles.pressed]}
            >
              <ImageIcon />
              <Text style={styles.btnLabel}>갤러리에서 선택</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.lg,
  },
  summary: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryValue: {
    fontFamily: fonts.bodySemiBold,
    color: colors.text,
  },
  buttons: {
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radius.card,
    padding: 18,
  },
  pressed: {
    opacity: 0.9,
  },
  btnLabel: {
    fontFamily: fonts.title,
    fontSize: 16,
    color: colors.white,
  },
});
