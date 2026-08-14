import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import type { OverlayMode } from '@/types';
import { colors, radius, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

const MODES: { key: OverlayMode; title: string; description: string; emoji: string }[] = [
  {
    key: 'frame',
    title: '프레임',
    description: '사진이 프레임 중앙 영역에 들어가요',
    emoji: '🖼️',
  },
  {
    key: 'sticker',
    title: '스티커',
    description: '사진 위에 스티커를 붙여요',
    emoji: '✨',
  },
];

export function HomeScreen({ navigation }: Props) {
  const { setMode, reset } = useSession();

  // 홈에 진입할 때마다 이전 세션을 초기화한다.
  React.useEffect(() => {
    const unsub = navigation.addListener('focus', reset);
    return unsub;
  }, [navigation, reset]);

  const handleSelect = (mode: OverlayMode) => {
    setMode(mode);
    navigation.navigate('SelectOverlay', { mode });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>무엇을 만들까요?</Text>
        <Text style={styles.subtitle}>프레임 또는 스티커를 선택해 시작하세요.</Text>
      </View>

      <View style={styles.cards}>
        {MODES.map((m) => (
          <Pressable
            key={m.key}
            onPress={() => handleSelect(m.key)}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          >
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={styles.cardTitle}>{m.title}</Text>
            <Text style={styles.cardDesc}>{m.description}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginTop: spacing.lg,
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  cards: {
    flex: 1,
    gap: spacing.md,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardPressed: {
    opacity: 0.85,
  },
  emoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
  },
  cardDesc: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
});
