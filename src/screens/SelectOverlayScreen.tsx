import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { OverlayThumbnail } from '@/components/OverlayThumbnail';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import {
  addFavorite,
  getFavorites,
  removeFavorite,
} from '@/storage/favorites';
import type { FavoriteOverlay, OverlayAsset } from '@/types';
import { colors, spacing } from '@/theme';
import {
  pickImageFromFiles,
  pickImageFromLibrary,
  toOverlayAsset,
} from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'SelectOverlay'>;

export function SelectOverlayScreen({ route, navigation }: Props) {
  const { mode } = route.params;
  const { overlay, setOverlay } = useSession();
  const [favorites, setFavorites] = useState<FavoriteOverlay[]>([]);
  const [loading, setLoading] = useState(false);

  const label = mode === 'frame' ? '프레임' : '스티커';

  const loadFavorites = useCallback(async () => {
    setFavorites(await getFavorites(mode));
  }, [mode]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  /** 갤러리 또는 파일에서 오버레이 이미지를 선택한다. */
  const handlePick = async (source: 'library' | 'files') => {
    try {
      setLoading(true);
      const photo =
        source === 'library' ? await pickImageFromLibrary() : await pickImageFromFiles();
      if (!photo) return;
      const asset = await toOverlayAsset(photo, mode);
      setOverlay(asset);
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '이미지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  /** 현재 선택된 오버레이를 즐겨찾기에 저장(영구 경로로 복사). */
  const handleSaveFavorite = async () => {
    if (!overlay) return;
    try {
      setLoading(true);
      // 즐겨찾기는 오래 보관하므로 앱 디렉터리에 복사한 뒤 저장한다.
      const persisted = await toOverlayAsset({ uri: overlay.uri }, mode, { persist: true });
      await addFavorite(persisted);
      await loadFavorites();
      Alert.alert('저장됨', '즐겨찾기에 추가했어요.');
    } catch (e) {
      Alert.alert('오류', e instanceof Error ? e.message : '즐겨찾기 저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFavorite = (fav: OverlayAsset) => setOverlay(fav);

  const handleRemoveFavorite = (fav: FavoriteOverlay) => {
    Alert.alert('즐겨찾기 삭제', '이 항목을 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          await removeFavorite(fav.id);
          if (overlay?.id === fav.id) setOverlay(null);
          await loadFavorites();
        },
      },
    ]);
  };

  const goNext = () => navigation.navigate('Capture');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={favorites}
        keyExtractor={(item) => item.id}
        numColumns={3}
        columnWrapperStyle={styles.column}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.sectionTitle}>{label} 불러오기</Text>
            <View style={styles.pickRow}>
              <Button
                label="갤러리에서"
                variant="secondary"
                onPress={() => handlePick('library')}
                style={styles.flex1}
                loading={loading}
              />
              <Button
                label="파일에서"
                variant="secondary"
                onPress={() => handlePick('files')}
                style={styles.flex1}
                loading={loading}
              />
            </View>

            {overlay ? (
              <View style={styles.selectedBox}>
                <OverlayThumbnail asset={overlay} selected onPress={() => {}} />
                <Button
                  label="⭐ 즐겨찾기에 추가"
                  variant="secondary"
                  onPress={handleSaveFavorite}
                  style={styles.favBtn}
                />
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, styles.favTitle]}>
              즐겨찾기 {favorites.length > 0 ? `(${favorites.length})` : ''}
            </Text>
            {favorites.length === 0 ? (
              <Text style={styles.empty}>
                자주 쓰는 {label}을(를) 즐겨찾기에 저장하면 여기서 바로 선택할 수 있어요.
              </Text>
            ) : null}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <OverlayThumbnail
              asset={item}
              selected={overlay?.id === item.id}
              onPress={() => handleSelectFavorite(item)}
              onLongPress={() => handleRemoveFavorite(item)}
            />
          </View>
        )}
      />

      <View style={styles.footer}>
        <Button label="다음 (촬영/불러오기)" onPress={goNext} disabled={!overlay} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  header: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  favTitle: {
    marginTop: spacing.md,
  },
  pickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex1: {
    flex: 1,
  },
  selectedBox: {
    marginTop: spacing.md,
    gap: spacing.sm,
    width: '40%',
  },
  favBtn: {
    minHeight: 44,
  },
  column: {
    gap: spacing.sm,
  },
  cell: {
    flex: 1 / 3,
    marginBottom: spacing.sm,
  },
  empty: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  footer: {
    padding: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});
