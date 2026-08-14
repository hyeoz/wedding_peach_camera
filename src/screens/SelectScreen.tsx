import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { Check, CloseIcon, StarIcon } from '@/components/Icons';
import { PillButton } from '@/components/PillButton';
import { Thumb } from '@/components/Thumb';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/context/SessionContext';
import { useUserLibrary } from '@/context/UserLibraryContext';
import { modeLabel, modeTitle, sourceForItem, type LibraryItem } from '@/data/library';
import type { RootStackParamList } from '@/navigation/types';
import { fonts, radius, shadow, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';
import { pickImageFromLibrary } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Select'>;

export function SelectScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const {
    mode,
    selectedFrameId,
    selectedItemIds,
    favorites,
    selectFrame,
    toggleItemChoice,
    toggleFavorite,
    forgetLibraryItem,
  } = useSession();
  const { ready, getItems, addItem, removeItem } = useUserLibrary();

  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  const items = getItems(mode);
  const favIds = favorites[mode];
  const isFrame = mode === 'frame';
  const userMode = mode === 'text' ? null : mode;

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

  const beginRegistration = async () => {
    if (!userMode || picking) return;
    try {
      setPicking(true);
      const image = await pickImageFromLibrary();
      if (image) {
        setDraftUri(image.uri);
        setDraftName('');
      }
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '이미지를 불러오지 못했습니다.');
    } finally {
      setPicking(false);
    }
  };

  const closeRegistration = () => {
    if (saving) return;
    setDraftUri(null);
    setDraftName('');
  };

  const confirmRegistration = async () => {
    if (!userMode || !draftUri || !draftName.trim() || saving) return;
    try {
      setSaving(true);
      const item = await addItem(userMode, draftName, draftUri);
      if (isFrame) selectFrame(item.id);
      else toggleItemChoice(item.id);
      setDraftUri(null);
      setDraftName('');
    } catch (error) {
      Alert.alert('등록 실패', error instanceof Error ? error.message : '항목을 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (item: LibraryItem) => {
    if (!userMode) return;
    Alert.alert(
      `${modeLabel(mode)} 삭제`,
      `“${item.label}” 항목을 삭제할까요?`,
      [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeItem(userMode, item.id);
              forgetLibraryItem(userMode, item.id);
            } catch (error) {
              Alert.alert(
                '삭제 실패',
                error instanceof Error ? error.message : '항목을 삭제하지 못했습니다.',
              );
            }
          },
        },
      ],
    );
  };

  const favoriteItems = items.filter((item) => favIds.includes(item.id));

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TopBar title={modeTitle(mode)} onBack={() => navigation.navigate('Home')} />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {userMode ? (
            <View style={styles.registerSection}>
              <View style={styles.registerCopy}>
                <Text style={styles.registerTitle}>내 {modeLabel(mode)} 만들기</Text>
                <Text style={styles.registerHint}>
                  이미지를 고르고 원하는 이름을 붙여 등록하세요
                  {mode === 'frame' ? ' · 투명 PNG 권장' : ''}
                </Text>
              </View>
              <PillButton
                label={`+ ${modeLabel(mode)} 등록`}
                onPress={beginRegistration}
                variant="outline"
                loading={picking}
                style={styles.registerButton}
              />
            </View>
          ) : null}

          {!ready ? (
            <View style={styles.loading}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : (
            <>
              {favoriteItems.length > 0 ? (
                <View style={styles.favSection}>
                  <Text style={styles.favHint}>즐겨찾기 · 탭하면 바로 촬영/갤러리로</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.favRow}>
                      {favoriteItems.map((item) => (
                        <Pressable
                          key={item.id}
                          style={styles.favChip}
                          onPress={() => onShortcut(item.id)}
                        >
                          <Thumb
                            emoji={item.emoji}
                            source={sourceForItem(item)}
                            style={styles.favThumb}
                            tint={colors.white}
                          />
                          <Text numberOfLines={1} style={styles.favLabel}>
                            {item.label}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              ) : null}

              {items.length === 0 && userMode ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>{mode === 'frame' ? '🖼️' : '✨'}</Text>
                  <Text style={styles.emptyTitle}>아직 등록한 {modeLabel(mode)}이 없어요</Text>
                  <Text style={styles.emptyHint}>위의 등록 버튼으로 첫 항목을 추가해 보세요</Text>
                </View>
              ) : (
                <View style={styles.grid}>
                  {items.map((item) => {
                    const selected = isSelected(item.id);
                    const isFav = favIds.includes(item.id);
                    return (
                      <View key={item.id} style={styles.cell}>
                        <Pressable onPress={() => onSelect(item.id)}>
                          <Thumb
                            emoji={item.emoji}
                            source={sourceForItem(item)}
                            style={[styles.thumb, selected && styles.thumbSelected]}
                            tint={colors.white}
                          />
                          {selected ? (
                            <View style={styles.check}>
                              <Check />
                            </View>
                          ) : null}
                        </Pressable>
                        {userMode ? (
                          <Pressable
                            accessibilityLabel={`${item.label} 삭제`}
                            style={styles.delete}
                            hitSlop={6}
                            onPress={() => deleteItem(item)}
                          >
                            <CloseIcon color={colors.primaryDeep} />
                          </Pressable>
                        ) : null}
                        <Pressable
                          accessibilityLabel={`${item.label} 즐겨찾기`}
                          style={styles.star}
                          hitSlop={6}
                          onPress={() => toggleFavorite(mode, item.id)}
                        >
                          <StarIcon
                            size={14}
                            fill={isFav ? colors.primary : 'none'}
                            stroke={colors.primary}
                          />
                        </Pressable>
                        <Text numberOfLines={1} style={styles.itemLabel}>
                          {item.label}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PillButton
            label="다음"
            onPress={() => navigation.navigate('Source')}
            disabled={nextDisabled}
          />
        </View>

        <Modal
          visible={!!draftUri}
          transparent
          animationType="fade"
          onRequestClose={closeRegistration}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeRegistration}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>새 {modeLabel(mode)} 등록</Text>
              {draftUri ? (
                <Thumb
                  source={{ uri: draftUri }}
                  resizeMode="contain"
                  tint={colors.tintPink}
                  style={styles.modalPreview}
                />
              ) : null}
              <Text style={styles.inputLabel}>이름</Text>
              <TextInput
                value={draftName}
                onChangeText={setDraftName}
                placeholder={`예: 우리의 ${modeLabel(mode)}`}
                placeholderTextColor={colors.textMuted}
                maxLength={24}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={confirmRegistration}
                style={styles.input}
              />
              <View style={styles.modalButtons}>
                <PillButton
                  label="취소"
                  variant="outline"
                  onPress={closeRegistration}
                  disabled={saving}
                  style={styles.flex1}
                />
                <PillButton
                  label="등록"
                  onPress={confirmRegistration}
                  disabled={!draftName.trim()}
                  loading={saving}
                  style={styles.flex1}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const COLUMN_GAP = spacing.md;

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingTop: spacing.sm,
    },
    scroll: {
      paddingBottom: spacing.lg,
    },
    registerSection: {
      marginHorizontal: spacing.lg,
      marginBottom: spacing.lg,
      padding: spacing.lg,
      borderRadius: radius.card,
      backgroundColor: 'rgba(255,255,255,0.72)',
      gap: spacing.md,
      ...shadow,
    },
    registerCopy: {
      gap: spacing.xs,
    },
    registerTitle: {
      fontFamily: fonts.title,
      fontSize: 17,
      color: colors.text,
    },
    registerHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
    },
    registerButton: {
      minHeight: 44,
      backgroundColor: colors.white,
    },
    loading: {
      minHeight: 180,
      alignItems: 'center',
      justifyContent: 'center',
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
    empty: {
      minHeight: 230,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    emptyEmoji: {
      fontSize: 42,
      marginBottom: spacing.md,
    },
    emptyTitle: {
      fontFamily: fonts.title,
      fontSize: 17,
      color: colors.text,
    },
    emptyHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      marginTop: spacing.xs,
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
    delete: {
      position: 'absolute',
      top: 4,
      left: 4,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      ...shadow,
    },
    star: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.9)',
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
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.38)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    modalCard: {
      width: '100%',
      backgroundColor: colors.white,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    modalTitle: {
      fontFamily: fonts.title,
      fontSize: 19,
      color: colors.text,
    },
    modalPreview: {
      width: '100%',
      height: 180,
      borderRadius: radius.thumb,
      backgroundColor: colors.tintPink,
    },
    inputLabel: {
      fontFamily: fonts.title,
      fontSize: 14,
      color: colors.text,
    },
    input: {
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.tintPink,
      borderRadius: radius.thumb,
      borderWidth: 1.5,
      borderColor: colors.border,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: spacing.md,
      marginTop: spacing.sm,
    },
    flex1: {
      flex: 1,
    },
  });
