import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Modal,
  PixelRatio,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import {
  DIET_TEMPLATE_NAME,
  DIET_THEMES,
  DietStoryCanvas,
  MEAL_LABELS,
  STORY_ASPECT,
  type DietField,
  type DietStoryData,
  type DietThemeKey,
  type MealKey,
} from '@/components/DietStoryCanvas';
import { GradientBackground } from '@/components/GradientBackground';
import { PillButton } from '@/components/PillButton';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import { loadDietLog, saveDietLogEntry } from '@/storage/dietLog';
import {
  fonts,
  radius,
  spacing,
  useContentBounds,
  useResponsive,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';
import {
  findPrevious,
  formatDateInput,
  formatDelta,
  formatStoryDate,
  formatWeight,
  parseDateInput,
  parseWeight,
  suggestDay,
  toDateKey,
  type DietLogEntry,
} from '@/utils/dietLog';
import { fitInside, type Size } from '@/utils/layout';
import { pickImageFromLibrary, takePhotoWithCamera } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'DietShare'>;

/** 결과 이미지 크기 = 인스타 스토리 규격. */
const OUTPUT = { width: 1080, height: 1920 };

const EMPTY_PHOTOS: Record<MealKey, string | null> = { breakfast: null, lunch: null, dinner: null };
const EMPTY_MEMOS: Record<MealKey, string> = { breakfast: '', lunch: '', dinner: '' };

interface InputState {
  field: DietField;
  title: string;
  value: string;
  placeholder: string;
  keyboardType: KeyboardTypeOptions;
  maxLength: number;
}

export function DietShareScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bounds = useContentBounds();
  const { modalMaxWidth } = useResponsive();
  const { setResultUri } = useSession();

  const [date, setDate] = useState(() => new Date());
  const dateKey = toDateKey(date);

  const [theme, setTheme] = useState<DietThemeKey>('oat');
  const [entries, setEntries] = useState<DietLogEntry[]>([]);
  // 사용자가 직접 고친 값. null 이면 지난 기록에서 자동으로 채운 값을 쓴다.
  const [dayInput, setDayInput] = useState<string | null>(null);
  const [weightInput, setWeightInput] = useState<string | null>(null);
  const [previousInput, setPreviousInput] = useState<string | null>(null);
  const [photos, setPhotos] = useState(EMPTY_PHOTOS);
  const [memos, setMemos] = useState(EMPTY_MEMOS);
  const [input, setInput] = useState<InputState | null>(null);
  const [area, setArea] = useState<Size>({ width: 0, height: 0 });
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef<View>(null);

  useEffect(() => {
    let alive = true;
    loadDietLog().then((loaded) => {
      if (alive) setEntries(loaded);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 고른 날짜 기준으로 지난 기록에서 전날 몸무게·회차·그날 몸무게를 채운다.
  // 날짜를 바꾸면 따라 바뀌고, 사용자가 직접 넣은 값은 그대로 둔다.
  const savedEntry = entries.find((entry) => entry.date === dateKey);
  const previousEntry = findPrevious(entries, dateKey);
  const day = dayInput ?? (entries.length > 0 ? String(suggestDay(entries, dateKey)) : '');
  const weight = weightInput ?? (savedEntry ? formatWeight(savedEntry.weight) : '');
  const previous = previousInput ?? (previousEntry ? formatWeight(previousEntry.weight) : '');

  const weightValue = parseWeight(weight);
  const previousValue = parseWeight(previous);

  const data: DietStoryData = {
    dateLabel: formatStoryDate(date),
    day,
    weight: weightValue !== null ? formatWeight(weightValue) : '',
    delta:
      weightValue !== null && previousValue !== null ? formatDelta(weightValue, previousValue) : '',
    photos,
    memos,
  };

  const canvasSize = fitInside(area, STORY_ASPECT);

  const setPhoto = (meal: MealKey, uri: string | null) =>
    setPhotos((current) => ({ ...current, [meal]: uri }));

  const choosePhoto = async (meal: MealKey, source: 'camera' | 'library') => {
    try {
      const photo = source === 'camera' ? await takePhotoWithCamera() : await pickImageFromLibrary();
      if (photo) setPhoto(meal, photo.uri);
    } catch (error) {
      Alert.alert('오류', error instanceof Error ? error.message : '사진을 불러오지 못했습니다.');
    }
  };

  const openPhotoMenu = (meal: MealKey) => {
    const hasPhoto = !!photos[meal];
    const options = ['카메라로 찍기', '앨범에서 고르기', ...(hasPhoto ? ['사진 빼기'] : []), '취소'];
    const handle = (index: number) => {
      if (index === 0) choosePhoto(meal, 'camera');
      else if (index === 1) choosePhoto(meal, 'library');
      else if (hasPhoto && index === 2) setPhoto(meal, null);
    };
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: `${MEAL_LABELS[meal]} 사진`,
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: hasPhoto ? 2 : undefined,
        },
        handle,
      );
    } else {
      Alert.alert(
        `${MEAL_LABELS[meal]} 사진`,
        undefined,
        options.map((label, index) => ({
          text: label,
          style: index === options.length - 1 ? 'cancel' : undefined,
          onPress: () => handle(index),
        })),
      );
    }
  };

  const onPressField = (field: DietField) => {
    switch (field.type) {
      case 'photo':
        openPhotoMenu(field.meal);
        return;
      case 'memo':
        setInput({
          field,
          title: `${MEAL_LABELS[field.meal]} 메뉴`,
          value: memos[field.meal],
          placeholder: '예: 그릭요거트, 바나나',
          keyboardType: 'default',
          maxLength: 24,
        });
        return;
      case 'date':
        setInput({
          field,
          title: '날짜',
          value: formatDateInput(date),
          placeholder: '예: 2026.11.10 또는 11.10',
          keyboardType: 'numbers-and-punctuation',
          maxLength: 10,
        });
        return;
      case 'weight':
        setInput({
          field,
          title: '공복 몸무게 (kg)',
          value: weight,
          placeholder: '예: 58.4',
          keyboardType: 'decimal-pad',
          maxLength: 6,
        });
        return;
      case 'previous':
        setInput({
          field,
          title: '전날 몸무게 (kg)',
          value: previous,
          placeholder: '예: 58.7',
          keyboardType: 'decimal-pad',
          maxLength: 6,
        });
        return;
      case 'day':
        setInput({
          field,
          title: '며칠째인가요?',
          value: day,
          placeholder: '예: 12',
          keyboardType: 'number-pad',
          maxLength: 4,
        });
    }
  };

  const confirmInput = () => {
    if (!input) return;
    const value = input.value.trim();
    const { field } = input;
    if ((field.type === 'weight' || field.type === 'previous') && value && parseWeight(value) === null) {
      Alert.alert('몸무게 확인', '숫자로 입력해 주세요. 예: 58.4');
      return;
    }
    if (field.type === 'date') {
      const next = parseDateInput(value, date);
      if (!next) {
        Alert.alert('날짜 확인', '2026.11.10 또는 11.10 처럼 입력해 주세요.');
        return;
      }
      setDate(next);
    } else if (field.type === 'memo') setMemos((current) => ({ ...current, [field.meal]: value }));
    else if (field.type === 'weight') setWeightInput(value);
    else if (field.type === 'previous') setPreviousInput(value);
    else if (field.type === 'day') setDayInput(value.replace(/\D/g, ''));
    setInput(null);
  };

  const finish = () => {
    if (exporting) return;
    setExporting(true);
    // 편집 힌트가 사라진 화면이 그려진 뒤 캡처한다.
    setTimeout(async () => {
      try {
        // view-shot 의 width/height 는 pt 단위라 화면 배율로 나눠야 1080×1920 px 이 된다.
        const scale = PixelRatio.get();
        const options = {
          format: 'png' as const,
          quality: 1,
          width: OUTPUT.width / scale,
          height: OUTPUT.height / scale,
        };
        const uri = await captureRef(canvasRef, options).catch(() =>
          captureRef(canvasRef, { ...options, useRenderInContext: true }),
        );
        if (!uri) throw new Error('이미지를 만들지 못했습니다.');
        if (weightValue !== null) {
          const dayNumber = Number(day);
          const saved = await saveDietLogEntry({
            date: dateKey,
            weight: weightValue,
            day: Number.isFinite(dayNumber) && dayNumber > 0 ? dayNumber : undefined,
          });
          setEntries(saved);
        }
        setResultUri(uri);
        navigation.navigate('Result');
      } catch (error) {
        Alert.alert('오류', error instanceof Error ? error.message : '이미지를 만들지 못했습니다.');
      } finally {
        setExporting(false);
      }
    }, 80);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={[styles.container, bounds]} edges={['top', 'bottom']}>
        <TopBar title={DIET_TEMPLATE_NAME} onBack={() => navigation.goBack()} />
        <Text style={styles.hint}>칸을 탭해서 사진과 글자를 넣어요</Text>

        <View
          style={styles.canvasArea}
          onLayout={(event) => {
            const { width, height } = event.nativeEvent.layout;
            setArea({ width, height });
          }}
        >
          {canvasSize ? (
            <View ref={canvasRef} collapsable={false} style={styles.canvasShadow}>
              <DietStoryCanvas
                data={data}
                theme={theme}
                width={canvasSize.width}
                exporting={exporting}
                onPressField={onPressField}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <View style={styles.themeRow}>
            {(Object.keys(DIET_THEMES) as DietThemeKey[]).map((key) => (
              <Pressable
                key={key}
                onPress={() => setTheme(key)}
                style={[styles.themeChip, theme === key && styles.themeChipOn]}
                accessibilityLabel={`${DIET_THEMES[key].label} 색`}
              >
                <View style={[styles.swatch, { backgroundColor: DIET_THEMES[key].bg }]} />
                <Text style={[styles.themeLabel, theme === key && styles.themeLabelOn]}>
                  {DIET_THEMES[key].label}
                </Text>
              </Pressable>
            ))}
          </View>
          <PillButton label="완성" onPress={finish} loading={exporting} style={styles.done} />
        </View>

        <Modal visible={!!input} transparent animationType="fade" onRequestClose={() => setInput(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setInput(null)}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Pressable style={[styles.modalCard, { maxWidth: modalMaxWidth }]} onPress={() => {}}>
                <Text style={styles.modalTitle}>{input?.title}</Text>
                <TextInput
                  value={input?.value ?? ''}
                  onChangeText={(value) => setInput((current) => (current ? { ...current, value } : current))}
                  placeholder={input?.placeholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType={input?.keyboardType}
                  maxLength={input?.maxLength}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={confirmInput}
                  style={styles.input}
                />
                <View style={styles.modalButtons}>
                  <PillButton label="취소" variant="outline" onPress={() => setInput(null)} style={styles.flex1} />
                  <PillButton label="확인" onPress={confirmInput} style={styles.flex1} />
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </GradientBackground>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1 },
    hint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
      marginBottom: spacing.sm,
    },
    canvasArea: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: spacing.lg,
    },
    canvasShadow: {
      shadowColor: '#000',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      paddingBottom: spacing.sm,
    },
    themeRow: { flexDirection: 'row', gap: spacing.sm },
    themeChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: radius.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    themeChipOn: { borderColor: colors.primary },
    swatch: { width: 16, height: 16, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
    themeLabel: { fontFamily: fonts.bodyMedium, fontSize: 13, color: colors.textMuted },
    themeLabelOn: { color: colors.text },
    done: { flex: 1 },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing.xl,
    },
    modalCard: {
      width: '100%',
      minWidth: 300,
      backgroundColor: colors.white,
      borderRadius: radius.card,
      padding: spacing.xl,
      gap: spacing.md,
    },
    modalTitle: { fontFamily: fonts.title, fontSize: 18, color: colors.text },
    input: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      fontFamily: fonts.body,
      fontSize: 16,
      color: colors.text,
    },
    modalButtons: { flexDirection: 'row', gap: spacing.sm },
    flex1: { flex: 1 },
  });
