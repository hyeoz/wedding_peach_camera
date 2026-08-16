import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { FrameIcon, StarIcon } from '@/components/Icons';
import { useProfile } from '@/context/ProfileContext';
import { useSession } from '@/context/SessionContext';
import type { OverlayMode } from '@/data/library';
import type { RootStackParamList } from '@/navigation/types';
import { fonts, radius, shadow, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

interface ModeCard {
  mode: OverlayMode;
  title: string;
  desc: string;
  tint: string;
  accent: string;
  titleColor: string;
  icon: React.ReactNode;
}

export function HomeScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { setMode, reset } = useSession();
  const { profile, hasProfile } = useProfile();

  React.useEffect(() => navigation.addListener('focus', reset), [navigation, reset]);

  const start = (mode: OverlayMode) => {
    setMode(mode);
    navigation.navigate('Select');
  };

  // 프레임/스티커 카드는 테마색을 따르고, 텍스트 카드는 고유 웜톤을 유지한다.
  const cards: ModeCard[] = [
    {
      mode: 'frame',
      title: '프레임',
      desc: '사진이 프레임 중앙 영역에 들어가요',
      tint: colors.tintPink,
      accent: colors.primary,
      titleColor: colors.primaryDeeper,
      icon: <FrameIcon />,
    },
    {
      mode: 'sticker',
      title: '스티커',
      desc: '사진 위에 자유롭게 꾸며요',
      tint: colors.tintPurple,
      accent: colors.secondary,
      titleColor: colors.secondaryDeep,
      icon: <StarIcon size={24} fill="#fff" />,
    },
    {
      mode: 'text',
      title: '텍스트',
      desc: '날짜·기록을 담은 텍스트 카드를 붙여요',
      tint: '#fff2e0',
      accent: '#ff9f43',
      titleColor: '#a85a00',
      icon: <Text style={{ fontFamily: fonts.title, fontSize: 22, color: colors.white }}>Aa</Text>,
    },
  ];

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container}>
        {/* 프로필 칩 */}
        <Pressable
          onPress={() => navigation.navigate('Profile')}
          style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{profile.emoji}</Text>
          </View>
          <View style={styles.profileText}>
            {hasProfile ? (
              <Text style={styles.profileName}>{profile.nickname}님</Text>
            ) : (
              <Text style={styles.profileName}>프로필을 설정해 주세요</Text>
            )}
            <Text style={styles.profileHint}>탭해서 닉네임·이모지 변경</Text>
          </View>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.title}>모드를 선택해주세요</Text>
          <Text style={styles.subtitle}>프레임 · 스티커 · 텍스트로 사진을 꾸며요</Text>
        </View>

        <View style={styles.cards}>
          {cards.map((c) => (
            <Pressable
              key={c.mode}
              onPress={() => start(c.mode)}
              style={({ pressed }) => [
                styles.card,
                { backgroundColor: c.tint },
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: c.accent }]}>{c.icon}</View>
              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: c.titleColor }]}>{c.title}</Text>
                <Text style={styles.cardDesc}>{c.desc}</Text>
              </View>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    gap: spacing.lg,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: radius.pill,
    padding: 8,
    paddingRight: spacing.lg,
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 20,
  },
  profileText: {
    justifyContent: 'center',
  },
  profileName: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.text,
  },
  profileHint: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
  },
  header: {
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 24,
    color: colors.text,
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
  },
  cards: {
    gap: spacing.md,
  },
  card: {
    borderRadius: radius.card,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    ...shadow,
  },
  pressed: {
    opacity: 0.9,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: fonts.title,
    fontSize: 18,
  },
  cardDesc: {
    fontFamily: fonts.body,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
});
