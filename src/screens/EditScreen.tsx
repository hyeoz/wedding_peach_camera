import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
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
import { coverFraction, fitInside, type Size } from '@/utils/layout';
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

type Props = NativeStackScreenProps<RootStackParamList, 'Edit'>;

interface NoteEdit {
  itemId: string;
  lineKey: string;
}

/** 사진 크기를 모를 때 쓰는 캔버스 비율. */
const FALLBACK_ASPECT = 3 / 4;

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
    reset,
  } = useSession();
  const { profile } = useProfile();
  const { getItem } = useUserLibrary();
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bounds = useContentBounds();
  const { modalMaxWidth } = useResponsive();

  const shotRef = useRef<ViewShot>(null);
  const canvasRef = useRef<View>(null);
  const canvasOrigin = useSharedValue({ x: 0, y: 0 });
  const canvasSize = useSharedValue<Size>({ width: 0, height: 0 });

  const [capturing, setCapturing] = useState(false);
  const [noteEdit, setNoteEdit] = useState<NoteEdit | null>(null);
  const [noteValue, setNoteValue] = useState('');
  const [stage, setStage] = useState<Size>({ width: 0, height: 0 });
  // undefined = 아직 조회 중. null = 알 수 없음(캔버스 비율로 간주).
  const [frameAspect, setFrameAspect] = useState<number | null | undefined>(undefined);
  const [photoSize, setPhotoSize] = useState<Size | null>(
    photo?.width && photo?.height ? { width: photo.width, height: photo.height } : null,
  );

  const hasOverlayItems = mode !== 'frame';

  const trayItems = useMemo(
    () =>
      selectedItemIds
        .map((id) => getItem(mode, id))
        .filter((it): it is NonNullable<typeof it> => Boolean(it)),
    [selectedItemIds, mode, getItem],
  );

  const selectedFrame = selectedFrameId ? getItem('frame', selectedFrameId) : undefined;
  const frameUri = selectedFrame?.uri;
  const photoUri = photo?.uri;

  /**
   * 사진의 실제 크기는 EXIF 회전이 적용된 뒤의 값이라야 한다.
   * 촬영/앨범이 준 width/height 는 회전 전 값일 수 있어, 표시용 크기를 다시 물어본다.
   */
  useEffect(() => {
    if (!photoUri) return;
    let alive = true;
    Image.getSize(
      photoUri,
      (width, height) => {
        if (alive && width > 0 && height > 0) setPhotoSize({ width, height });
      },
      () => {},
    );
    return () => {
      alive = false;
    };
  }, [photoUri]);

  /** 프레임은 원본 비율 그대로 올라가므로 이미지 자체의 비율을 알아야 한다. */
  useEffect(() => {
    if (!frameUri) {
      setFrameAspect(null);
      return;
    }
    let alive = true;
    setFrameAspect(undefined);
    Image.getSize(
      frameUri,
      (width, height) => {
        if (alive) setFrameAspect(width > 0 && height > 0 ? width / height : null);
      },
      () => {
        if (alive) setFrameAspect(null);
      },
    );
    return () => {
      alive = false;
    };
  }, [frameUri]);

  const photoAspect = photoSize ? photoSize.width / photoSize.height : FALLBACK_ASPECT;

  /** 캔버스 = 사진 비율 그대로. 남는 공간은 바깥 stage 에 앱 배경으로 남는다. */
  const canvas = useMemo(() => fitInside(stage, photoAspect), [stage, photoAspect]);

  useEffect(() => {
    canvasSize.value = canvas ?? { width: 0, height: 0 };
  }, [canvas, canvasSize]);

  /** 프레임의 처음 배치 — 캔버스를 덮되 원본 비율을 유지하는 크기로 가운데 정렬. */
  const frameDefaults = useMemo(() => {
    const fraction = coverFraction(photoAspect, frameAspect || photoAspect);
    return {
      x: (1 - fraction.width) / 2,
      y: (1 - fraction.height) / 2,
      scale: 1,
      rotation: 0,
    };
  }, [photoAspect, frameAspect]);

  const frameItem = placedItems.find((item) => item.kind === 'frame');

  // 프레임 모드로 들어오면 선택한 프레임을 캔버스 항목으로 한 번 올린다.
  // 이후로는 스티커와 똑같이 옮기고 돌리고 키울 수 있다.
  useEffect(() => {
    if (mode !== 'frame' || !selectedFrameId || frameAspect === undefined) return;
    if (!frameItem) {
      addPlacedItem(selectedFrameId, { kind: 'frame', ...frameDefaults });
      return;
    }
    // 편집 도중 다른 프레임을 고르고 돌아온 경우 처음 상태로 갈아 끼운다.
    if (frameItem.refId !== selectedFrameId) {
      updatePlacedItem(frameItem.id, { refId: selectedFrameId, ...frameDefaults });
    }
  }, [
    mode,
    selectedFrameId,
    frameItem,
    frameAspect,
    frameDefaults,
    addPlacedItem,
    updatePlacedItem,
  ]);

  const resetFrame = useCallback(
    (id: string) => updatePlacedItem(id, frameDefaults),
    [updatePlacedItem, frameDefaults],
  );

  if (!photo) {
    return (
      <GradientBackground>
        <SafeAreaView style={styles.center}>
          <Text style={styles.hint}>편집할 사진이 없어요.</Text>
          {/* 사진 없이 여기까지 온 건 세션이 어긋난 상태다. 남은 선택·배치를 비우고 처음으로 보낸다. */}
          <PillButton
            label="처음으로"
            onPress={() => {
              reset();
              navigation.popToTop();
            }}
          />
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
      <SafeAreaView style={[styles.container, bounds]} edges={['top', 'bottom']}>
        <TopBar title="편집" centered onBack={() => navigation.goBack()} />

        {/*
          캔버스는 사진 비율 그대로다. 남는 공간은 stage 에 앱 배경으로 남기고,
          둥근 모서리는 캡처 밖(canvasFrame)에서 준다. 캡처 영역 안에 두면
          저장된 PNG 의 네 모서리가 투명하게 깎인다.
        */}
        <View
          style={styles.stage}
          onLayout={({ nativeEvent }) => setStage(nativeEvent.layout)}
        >
          {canvas ? (
            <View style={[styles.canvasFrame, canvas]}>
              <ViewShot
                ref={shotRef}
                options={{ format: 'png', quality: 1 }}
                style={styles.shot}
              >
                {/*
                  프레임이 올라가 있으면 캔버스 전체가 프레임 본체라 배경 탭이 닿지 않는다.
                  선택 해제는 프레임 자신의 탭 제스처가 맡으므로 여기서는 비워 둔다.
                  (두 곳이 함께 반응하면 선택하자마자 다시 풀려 조작 UI를 못 띄운다.)
                */}
                <Pressable
                  ref={canvasRef}
                  onLayout={measureCanvas}
                  onPress={frameItem ? undefined : () => setActiveItem(null)}
                  style={styles.canvas}
                >
                  <Thumb
                    source={{ uri: photo.uri }}
                    resizeMode="cover"
                    borderRadius={0}
                    style={StyleSheet.absoluteFill}
                  />

                  {placedItems.map((item: PlacedItem) => (
                    <PlacedItemView
                      key={item.id}
                      item={item}
                      active={activeItemId === item.id}
                      hideChrome={capturing}
                      nickname={profile.nickname}
                      takenAt={photo.takenAt}
                      sticker={item.kind === 'sticker' ? getItem('sticker', item.refId) : undefined}
                      frame={item.kind === 'frame' ? selectedFrame : undefined}
                      frameAspect={frameAspect}
                      canvasWidth={canvas.width}
                      canvasHeight={canvas.height}
                      canvasSize={canvasSize}
                      canvasOrigin={canvasOrigin}
                      onActivate={setActiveItem}
                      onCommit={updatePlacedItem}
                      onDelete={deletePlacedItem}
                      onReset={resetFrame}
                      onToggleChoice={onToggleChoice}
                      onEditNote={onEditNote}
                    />
                  ))}
                </Pressable>
              </ViewShot>
            </View>
          ) : null}
        </View>

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
            <Pressable style={[styles.modalCard, { maxWidth: modalMaxWidth }]} onPress={() => {}}>
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
  /** 캔버스가 놓이는 자리. 사진 비율을 맞추고 남는 공간은 앱 배경 그대로 둔다. */
  stage: {
    flex: 1,
    minHeight: 160,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** 둥근 모서리는 캡처 영역 바깥에서 준다 (저장 PNG 모서리가 깎이지 않게). */
  canvasFrame: {
    borderRadius: radius.canvas,
    overflow: 'hidden',
  },
  shot: {
    width: '100%',
    height: '100%',
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
