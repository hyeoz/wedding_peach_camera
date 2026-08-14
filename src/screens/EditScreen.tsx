import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

import { FrameOverlay } from '@/components/FrameOverlay';
import { GradientBackground } from '@/components/GradientBackground';
import { PillButton } from '@/components/PillButton';
import { PlacedItemView } from '@/components/PlacedItemView';
import { Thumb } from '@/components/Thumb';
import { TopBar } from '@/components/TopBar';
import { useProfile } from '@/context/ProfileContext';
import { useSession } from '@/context/SessionContext';
import { useUserLibrary } from '@/context/UserLibraryContext';
import { sourceForItem } from '@/data/library';
import type { RootStackParamList } from '@/navigation/types';
import type { PlacedItem } from '@/types';
import { fonts, radius, spacing, useTheme, useThemedStyles, type ThemeColors } from '@/theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Edit'>;

interface NoteEdit {
  itemId: string;
  lineKey: string;
}

export function EditScreen({ navigation }: Props) {
  const {
    mode,
    photo,
    selectedFrameId,
    selectedItemIds,
    placedItems,
    activeItemId,
    addPlacedItem,
    updatePlacedItem,
    deletePlacedItem,
    setActiveItem,
    setResultUri,
  } = useSession();
  const { profile } = useProfile();
  const { getItem } = useUserLibrary();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);

  const shotRef = useRef<ViewShot>(null);
  const canvasRef = useRef<View>(null);
  const canvasOrigin = useSharedValue({ x: 0, y: 0 });

  const [capturing, setCapturing] = useState(false);
  const [noteEdit, setNoteEdit] = useState<NoteEdit | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const hasOverlayItems = mode !== 'frame';

  const trayItems = useMemo(
    () =>
      selectedItemIds
        .map((id) => getItem(mode, id))
        .filter((it): it is NonNullable<typeof it> => Boolean(it)),
    [selectedItemIds, mode, getItem],
  );

  const selectedFrame = selectedFrameId ? getItem('frame', selectedFrameId) : undefined;

  if (!photo) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center}>
          <Text style={styles.hint}>편집할 사진이 없어요.</Text>
          <PillButton label="처음으로" onPress={() => navigation.popToTop()} />
        </SafeAreaView>
      </GradientBackground>
    );
  }

  const measureCanvas = () => {
    canvasRef.current?.measureInWindow((x, y) => {
      canvasOrigin.value = { x, y };
    });
  };

  const onToggleChoice = (itemId: string, lineKey: string, option: string) => {
    const item = placedItems.find((p) => p.id === itemId);
    if (!item) return;
    const current = item.choices?.[lineKey];
    const nextChoices = { ...(item.choices ?? {}) };
    if (current === option) delete nextChoices[lineKey];
    else nextChoices[lineKey] = option;
    updatePlacedItem(itemId, { choices: nextChoices });
  };

  const onEditNote = (itemId: string, lineKey: string) => {
    const item = placedItems.find((p) => p.id === itemId);
    setNoteValue(item?.notes?.[lineKey] ?? '');
    setNoteEdit({ itemId, lineKey });
  };

  const saveNote = () => {
    if (!noteEdit) return;
    const item = placedItems.find((p) => p.id === noteEdit.itemId);
    const nextNotes = { ...(item?.notes ?? {}), [noteEdit.lineKey]: noteValue };
    updatePlacedItem(noteEdit.itemId, { notes: nextNotes });
    setNoteEdit(null);
  };

  const handleDone = () => {
    setActiveItem(null);
    setCapturing(true);
    // 선택 UI가 사라진 뒤 캡처되도록 한 프레임 대기.
    setTimeout(async () => {
      try {
        const uri = await shotRef.current?.capture?.();
        if (uri) {
          setResultUri(uri);
          navigation.navigate('Result');
        }
      } catch (e) {
        Alert.alert('오류', e instanceof Error ? e.message : '이미지 생성에 실패했습니다.');
      } finally {
        setCapturing(false);
      }
    }, 80);
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <TopBar title="편집" centered onBack={() => navigation.goBack()} />

        <ViewShot ref={shotRef} options={{ format: 'png', quality: 1 }} style={styles.shot}>
          <Pressable
            ref={canvasRef}
            onLayout={measureCanvas}
            onPress={() => setActiveItem(null)}
            style={styles.canvas}
          >
            <Thumb
              source={{ uri: photo.uri }}
              resizeMode="cover"
              borderRadius={0}
              style={StyleSheet.absoluteFillObject}
            />

            {mode === 'frame' ? (
              <FrameOverlay frame={selectedFrame} showLabel={!capturing} />
            ) : (
              placedItems.map((item: PlacedItem) => (
                <PlacedItemView
                  key={item.id}
                  item={item}
                  active={activeItemId === item.id}
                  hideChrome={capturing}
                  nickname={profile.nickname}
                  sticker={item.kind === 'sticker' ? getItem('sticker', item.refId) : undefined}
                  canvasOrigin={canvasOrigin}
                  onActivate={setActiveItem}
                  onCommit={updatePlacedItem}
                  onDelete={deletePlacedItem}
                  onToggleChoice={onToggleChoice}
                  onEditNote={onEditNote}
                />
              ))
            )}
          </Pressable>
        </ViewShot>

        {/* 스티커/텍스트 트레이 */}
        {hasOverlayItems ? (
          <View style={styles.trayWrap}>
            <Text style={styles.trayHint}>
              {mode === 'sticker' ? '탭해서 스티커 추가' : '탭해서 텍스트 카드 추가'}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.tray}>
                {trayItems.map((it) => (
                  <Pressable key={it.id} onPress={() => addPlacedItem(it.id)} style={styles.trayItem}>
                    <Thumb emoji={it.emoji} source={sourceForItem(it)} tint={colors.white} borderRadius={10} style={styles.trayThumb} />
                  </Pressable>
                ))}
              </View>
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.actions}>
          <PillButton
            label="다시 촬영"
            variant="outline"
            onPress={() => navigation.navigate('Source')}
            style={styles.flex1}
          />
          <PillButton label="완료" onPress={handleDone} loading={capturing} style={styles.flex1} />
        </View>

        {/* 특이사항/메모 입력 모달 */}
        <Modal visible={!!noteEdit} transparent animationType="fade" onRequestClose={() => setNoteEdit(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setNoteEdit(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>내용 입력</Text>
              <TextInput
                value={noteValue}
                onChangeText={setNoteValue}
                placeholder="내용을 입력하세요"
                placeholderTextColor={colors.textMuted}
                style={styles.modalInput}
                multiline
                autoFocus
              />
              <View style={styles.modalButtons}>
                <PillButton label="취소" variant="outline" onPress={() => setNoteEdit(null)} style={styles.flex1} />
                <PillButton label="확인" onPress={saveNote} style={styles.flex1} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
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
  shot: {
    flex: 1,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.canvas,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  trayWrap: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  trayHint: {
    fontFamily: fonts.body,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  tray: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  trayItem: {
    width: 52,
    height: 52,
  },
  trayThumb: {
    width: 52,
    height: 52,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  flex1: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  hint: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.textMuted,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    fontSize: 17,
    color: colors.text,
  },
  modalInput: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.text,
    backgroundColor: colors.tintPink,
    borderRadius: radius.thumb,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
