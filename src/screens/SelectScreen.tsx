import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { Check, StarIcon } from '@/components/Icons';
import { PillButton } from '@/components/PillButton';
import { Thumb } from '@/components/Thumb';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/context/SessionContext';
import { getSelectableItems, modeTitle } from '@/data/library';
import type { RootStackParamList } from '@/navigation/types';
import { colors, fonts, radius, shadow, spacing } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Select'>;

export function SelectScreen({ navigation }: Props) {
  const {
    mode,
    selectedFrameId,
    selectedItemIds,
    favorites,
    selectFrame,
    toggleItemChoice,
    toggleFavorite,
  } = useSession();

  const items = getSelectableItems(mode);
  const favIds = favorites[mode];
  const isFrame = mode === 'frame';

  const isSelected = (id: string) =>
    isFrame ? selectedFrameId === id : selectedItemIds.includes(id);

  const onSelect = (id: string) => (isFrame ? selectFrame(id) : toggleItemChoice(id));

  const nextDisabled = isFrame ? !selectedFrameId : selectedItemIds.length === 0;

  /** 즐겨찾기 탭 → 선택 상태로 만들고 바로 Source 화면으로 (숏컷). */
  const onShortcut = (id: string) => {
    if (isFrame) {
      selectFrame(id);
    } else if (!selectedItemIds.includes(id)) {
      toggleItemChoice(id);
    }
    navigation.navigate('Source');
  };

  const favoriteItems = items.filter((it) => favIds.includes(it.id));

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TopBar title={modeTitle(mode)} onBack={() => navigation.navigate('Home')} />

        <ScrollView contentContainerStyle={styles.scroll}>
          {favoriteItems.length > 0 ? (
            <View style={styles.favSection}>
              <Text style={styles.favHint}>즐겨찾기 · 탭하면 바로 촬영/갤러리로</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.favRow}>
                  {favoriteItems.map((it) => (
                    <Pressable key={it.id} style={styles.favChip} onPress={() => onShortcut(it.id)}>
                      <Thumb
                        emoji={it.emoji}
                        source={it.source}
                        style={styles.favThumb}
                        tint={colors.white}
                      />
                      <Text numberOfLines={1} style={styles.favLabel}>
                        {it.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>
          ) : null}

          <View style={styles.grid}>
            {items.map((it) => {
              const selected = isSelected(it.id);
              const isFav = favIds.includes(it.id);
              return (
                <View key={it.id} style={styles.cell}>
                  <Pressable onPress={() => onSelect(it.id)}>
                    <Thumb
                      emoji={it.emoji}
                      source={it.source}
                      style={[styles.thumb, selected && styles.thumbSelected]}
                      tint={colors.white}
                    />
                    {selected ? (
                      <View style={styles.check}>
                        <Check />
                      </View>
                    ) : null}
                  </Pressable>
                  <Pressable
                    style={styles.star}
                    hitSlop={6}
                    onPress={() => toggleFavorite(mode, it.id)}
                  >
                    <StarIcon
                      size={14}
                      fill={isFav ? colors.primary : 'none'}
                      stroke={colors.primary}
                    />
                  </Pressable>
                  <Text numberOfLines={1} style={styles.itemLabel}>
                    {it.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <PillButton label="다음" onPress={() => navigation.navigate('Source')} disabled={nextDisabled} />
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}

const COLUMN_GAP = spacing.md;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.sm,
  },
  scroll: {
    paddingBottom: spacing.lg,
  },
  favSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  favHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  favRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  favChip: {
    width: 72,
    alignItems: 'center',
  },
  favThumb: {
    width: 72,
    height: 72,
    ...shadow,
  },
  favLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: COLUMN_GAP,
  },
  cell: {
    width: `${(100 - 4) / 3}%`,
  },
  thumb: {
    width: '100%',
    aspectRatio: 1,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  thumbSelected: {
    borderColor: colors.primary,
  },
  check: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  itemLabel: {
    fontFamily: fonts.body,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 6,
  },
  footer: {
    padding: spacing.lg,
  },
});
