import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { PillButton } from '@/components/PillButton';
import { TopBar } from '@/components/TopBar';
import { PROFILE_EMOJIS, useProfile } from '@/context/ProfileContext';
import type { RootStackParamList } from '@/navigation/types';
import { colors, fonts, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;

export function ProfileScreen({ navigation }: Props) {
  const { profile, saveProfile } = useProfile();
  const [nickname, setNickname] = useState(profile.nickname);
  const [emoji, setEmoji] = useState(profile.emoji);

  const handleSave = async () => {
    await saveProfile({ nickname, emoji });
    navigation.goBack();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TopBar title="내 프로필" onBack={() => navigation.goBack()} />

        <View style={styles.body}>
          {/* 미리보기 아바타 */}
          <View style={styles.preview}>
            <View style={styles.previewAvatar}>
              <Text style={styles.previewEmoji}>{emoji}</Text>
            </View>
            <Text style={styles.previewName}>
              {nickname.trim() ? `${nickname.trim()}님` : 'OOO님'}
            </Text>
          </View>

          <Text style={styles.label}>닉네임</Text>
          <TextInput
            value={nickname}
            onChangeText={setNickname}
            placeholder="닉네임을 입력하세요"
            placeholderTextColor={colors.textMuted}
            maxLength={12}
            style={styles.input}
            returnKeyType="done"
          />

          <Text style={styles.label}>이모지 선택</Text>
          <View style={styles.emojiGrid}>
            {PROFILE_EMOJIS.map((e) => (
              <Pressable
                key={e}
                onPress={() => setEmoji(e)}
                style={[styles.emojiCell, emoji === e && styles.emojiCellOn]}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <PillButton label="저장" onPress={handleSave} disabled={!nickname.trim()} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  preview: {
    alignItems: 'center',
    gap: spacing.sm,
    marginVertical: spacing.lg,
  },
  previewAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewEmoji: {
    fontSize: 44,
  },
  previewName: {
    fontFamily: fonts.title,
    fontSize: 20,
    color: colors.text,
  },
  label: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.text,
    marginTop: spacing.md,
  },
  input: {
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.white,
    borderRadius: radius.thumb,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  emojiCell: {
    width: 52,
    height: 52,
    borderRadius: radius.thumb,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  emojiCellOn: {
    borderColor: colors.primary,
    backgroundColor: colors.tintPink,
  },
  emojiText: {
    fontSize: 26,
  },
  footer: {
    padding: spacing.xl,
  },
});
