import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
import {
  CHOICE_SEPARATOR,
  TEMPLATE_EXAMPLE,
  TOKEN_DATE,
  TOKEN_INPUT,
  TOKEN_NICKNAME,
  parseTemplateSource,
} from '@/data/textTemplateParser';
import {
  CARD_EMOJIS,
  CARD_TINTS,
  DEFAULT_CARD_EMOJI,
  DEFAULT_CARD_TINT,
} from '@/data/textTemplates';
import { TextCard } from '@/components/TextCard';
import { useProfile } from '@/context/ProfileContext';
import type { RootStackParamList } from '@/navigation/types';
import {
  fonts,
  gridCellWidth,
  radius,
  shadow,
  spacing,
  useCanvasAspectRatio,
  useContentBounds,
  useResponsive,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';
import { pickImageFromLibrary } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Select'>;

export function SelectScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bounds = useContentBounds();
  const { contentWidth, gridColumns, gutter, height, modalMaxWidth } = useResponsive();
  const canvasAspectRatio = useCanvasAspectRatio();
  const cellWidth = gridCellWidth(contentWidth, gridColumns, COLUMN_GAP, gutter);
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
  const { ready, getItems, addItem, addTextItem, removeItem } = useUserLibrary();
  const { profile } = useProfile();

  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [draftName, setDraftName] = useState('');
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);

  // 텍스트 템플릿 등록 상태
  const [textDraftOpen, setTextDraftOpen] = useState(false);
  const [textSource, setTextSource] = useState(TEMPLATE_EXAMPLE);
  const [textTint, setTextTint] = useState<string>(DEFAULT_CARD_TINT);
  const [textEmoji, setTextEmoji] = useState<string>(DEFAULT_CARD_EMOJI);

  const items = getItems(mode);
  const favIds = favorites[mode];
  const isFrame = mode === 'frame';
  const isText = mode === 'text';
  /** 이미지(프레임·스티커) 등록 모드. 텍스트는 별도 흐름이라 제외한다. */
  const imageMode = isText ? null : mode;

  // 입력하는 동안 실시간으로 컴파일해 미리보기와 오류를 함께 보여준다.
  const textPreview = parseTemplateSource(textSource, {
    id: 'preview',
    label: draftName.trim() || '미리보기',
    tint: textTint,
    emoji: textEmoji,
  });

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
    if (!imageMode || picking) return;
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
    if (!imageMode || !draftUri || !draftName.trim() || saving) return;
    try {
      setSaving(true);
      const item = await addItem(imageMode, draftName, draftUri);
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

  const resetTextDraft = () => {
    setTextSource(TEMPLATE_EXAMPLE);
    setTextTint(DEFAULT_CARD_TINT);
    setTextEmoji(DEFAULT_CARD_EMOJI);
    setDraftName('');
  };

  const closeTextRegistration = () => {
    if (saving) return;
    setTextDraftOpen(false);
    resetTextDraft();
  };

  const confirmTextRegistration = async () => {
    if (!draftName.trim() || textPreview.errors.length > 0 || saving) return;
    try {
      setSaving(true);
      const item = await addTextItem(draftName, textSource, textTint, textEmoji);
      toggleItemChoice(item.id);
      setTextDraftOpen(false);
      resetTextDraft();
    } catch (error) {
      Alert.alert('등록 실패', error instanceof Error ? error.message : '템플릿을 등록하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = (item: LibraryItem) => {
    if (item.builtIn) return;
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
              await removeItem(mode, item.id);
              forgetLibraryItem(mode, item.id);
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
      <SafeAreaView style={[styles.container, bounds]} edges={['top', 'bottom']}>
        <TopBar title={modeTitle(mode)} onBack={() => navigation.navigate('Home')} />

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {imageMode ? (
            <View style={styles.registerSection}>
              <View style={styles.registerCopy}>
                <Text style={styles.registerTitle}>내 {modeLabel(mode)} 만들기</Text>
                <Text style={styles.registerHint}>
                  이미지를 고르고 원하는 이름을 붙여 등록하세요
                  {mode === 'frame' ? '\n투명 PNG · 세로로 긴 비율 권장 (사진 영역에 꽉 차게 늘어나요)' : ''}
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

          {isText ? (
            <View style={styles.registerSection}>
              <View style={styles.registerCopy}>
                <Text style={styles.registerTitle}>내 텍스트 만들기</Text>
                <Text style={styles.registerHint}>
                  날짜·선택·입력 칸이 있는 나만의 카드를 직접 만들어요
                </Text>
              </View>
              <PillButton
                label="+ 텍스트 등록"
                onPress={() => setTextDraftOpen(true)}
                variant="outline"
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

              {items.length === 0 && imageMode ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyEmoji}>{mode === 'frame' ? '🖼️' : '✨'}</Text>
                  <Text style={styles.emptyTitle}>아직 등록한 {modeLabel(mode)}이 없어요</Text>
                  <Text style={styles.emptyHint}>위의 등록 버튼으로 첫 항목을 추가해 보세요</Text>
                </View>
              ) : (
                <View style={[styles.grid, { paddingHorizontal: gutter }]}>
                  {items.map((item) => {
                    const selected = isSelected(item.id);
                    const isFav = favIds.includes(item.id);
                    return (
                      <View key={item.id} style={{ width: cellWidth }}>
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
                        {imageMode ? (
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
            <Pressable style={[styles.modalCard, { maxWidth: modalMaxWidth }]} onPress={() => {}}>
              <Text style={styles.modalTitle}>새 {modeLabel(mode)} 등록</Text>
              {draftUri ? (
                <>
                  {/*
                    프레임은 편집 캔버스를 꽉 채우도록 늘어난다(FrameOverlay 의 stretch).
                    미리보기도 같은 비율·같은 방식으로 보여줘야 등록 후에 놀라지 않는다.
                  */}
                  <Thumb
                    source={{ uri: draftUri }}
                    resizeMode={isFrame ? 'stretch' : 'contain'}
                    tint={colors.tintPink}
                    style={[
                      styles.modalPreview,
                      isFrame && { aspectRatio: canvasAspectRatio, height: undefined },
                    ]}
                  />
                  {isFrame ? (
                    <Text style={styles.previewNote}>
                      실제 사진 영역 비율로 보여줍니다 · 비율이 다르면 이렇게 늘어나요
                    </Text>
                  ) : null}
                </>
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

        {/* 텍스트 템플릿 등록 */}
        <Modal
          visible={textDraftOpen}
          transparent
          animationType="fade"
          onRequestClose={closeTextRegistration}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeTextRegistration}>
            {/*
              내용이 길어 키보드가 올라오면 등록 버튼이 가려진다. 카드 높이도 묶어두지
              않으면 화면 밖으로 자라 안쪽 ScrollView 가 스크롤되지 않는다.
              maxHeight 는 퍼센트 대신 실제 화면 높이로 계산해 부모 높이에 의존하지 않게 한다.
            */}
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardAvoid}
            >
              <Pressable
                style={[
                  styles.modalCard,
                  { maxWidth: modalMaxWidth, maxHeight: Math.round(height * 0.82) },
                ]}
                onPress={() => {}}
              >
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <Text style={styles.modalTitle}>새 텍스트 등록</Text>

                <Text style={styles.inputLabel}>이름</Text>
                <TextInput
                  value={draftName}
                  onChangeText={setDraftName}
                  placeholder="예: 나의 데일리 체크"
                  placeholderTextColor={colors.textMuted}
                  maxLength={24}
                  returnKeyType="next"
                  style={styles.input}
                />

                <Text style={styles.inputLabel}>내용</Text>
                <Text style={styles.syntaxHint}>
                  첫 줄은 카드 제목 · {TOKEN_NICKNAME} 닉네임 · {TOKEN_DATE} 오늘 날짜{'\n'}
                  {`선택지는 ${CHOICE_SEPARATOR} 로 구분 (예: 식단 good ${CHOICE_SEPARATOR} bad)`}{'\n'}
                  {`자유 입력 칸은 ${TOKEN_INPUT} (예: 특이사항 ${TOKEN_INPUT})`}
                </Text>
                <TextInput
                  value={textSource}
                  onChangeText={setTextSource}
                  placeholder={TEMPLATE_EXAMPLE}
                  placeholderTextColor={colors.textMuted}
                  style={[styles.input, styles.sourceInput]}
                  multiline
                  autoCapitalize="none"
                  autoCorrect={false}
                />

                <Text style={styles.inputLabel}>이모지</Text>
                <View style={styles.tintRow}>
                  {CARD_EMOJIS.map((emoji) => (
                    <Pressable
                      key={emoji}
                      accessibilityLabel={`${emoji} 이모지`}
                      onPress={() => setTextEmoji(emoji)}
                      style={[
                        styles.emojiSwatch,
                        textEmoji === emoji && styles.emojiSwatchOn,
                      ]}
                    >
                      <Text style={styles.emojiSwatchText}>{emoji}</Text>
                    </Pressable>
                  ))}
                </View>

                <Text style={styles.inputLabel}>카드 색</Text>
                <View style={styles.tintRow}>
                  {CARD_TINTS.map((tint) => (
                    <Pressable
                      key={tint.id}
                      accessibilityLabel={`${tint.label} 배경`}
                      onPress={() => setTextTint(tint.value)}
                      style={[
                        styles.tintSwatch,
                        { backgroundColor: tint.value },
                        textTint === tint.value && styles.tintSwatchOn,
                      ]}
                    />
                  ))}
                </View>

                <Text style={styles.inputLabel}>미리보기</Text>
                {textPreview.template ? (
                  <View style={styles.previewWrap}>
                    <TextCard
                      template={textPreview.template}
                      nickname={profile.nickname}
                      choices={{}}
                      notes={{}}
                    />
                  </View>
                ) : (
                  <View style={styles.errorBox}>
                    {textPreview.errors.map((error) => (
                      <Text key={error} style={styles.errorText}>
                        · {error}
                      </Text>
                    ))}
                  </View>
                )}

                <View style={styles.modalButtons}>
                  <PillButton
                    label="취소"
                    variant="outline"
                    onPress={closeTextRegistration}
                    disabled={saving}
                    style={styles.flex1}
                  />
                  <PillButton
                    label="등록"
                    onPress={confirmTextRegistration}
                    disabled={!draftName.trim() || textPreview.errors.length > 0}
                    loading={saving}
                    style={styles.flex1}
                  />
                </View>
              </ScrollView>
              </Pressable>
            </KeyboardAvoidingView>
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
      // paddingHorizontal은 화면 크기에 따라 런타임에 주입 (gutter)
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: COLUMN_GAP,
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
    keyboardAvoid: {
      width: '100%',
      alignItems: 'center',
    },
    previewNote: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: -spacing.sm,
    },
    syntaxHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      color: colors.textMuted,
      marginBottom: spacing.xs,
    },
    sourceInput: {
      minHeight: 132,
      textAlignVertical: 'top',
      fontSize: 15,
    },
    tintRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
    },
    tintSwatch: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    tintSwatchOn: {
      borderWidth: 3,
      borderColor: colors.primary,
    },
    emojiSwatch: {
      width: 40,
      height: 40,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.white,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiSwatchOn: {
      borderWidth: 2.5,
      borderColor: colors.primary,
      backgroundColor: colors.tintPink,
    },
    emojiSwatchText: {
      fontSize: 20,
      lineHeight: 26,
    },
    previewWrap: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    errorBox: {
      backgroundColor: colors.tintPink,
      borderRadius: radius.thumb,
      borderWidth: 1.5,
      borderColor: colors.primary,
      padding: spacing.md,
      gap: 4,
    },
    errorText: {
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      color: colors.primaryDeep,
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
