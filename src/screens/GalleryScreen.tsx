import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { PillButton } from '@/components/PillButton';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import {
  fonts,
  gridCellWidth,
  spacing,
  useContentBounds,
  useResponsive,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';
import { loadRecentPhotos, pickImageFromLibrary, resolveAssetUri } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

export function GalleryScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bounds = useContentBounds();
  const { contentWidth, gridColumns, gutter } = useResponsive();
  const cellWidth = gridCellWidth(contentWidth, gridColumns, spacing.sm, gutter);
  const { setPhoto, clearPlacedItems } = useSession();
  const [assets, setAssets] = useState<MediaLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setAssets(await loadRecentPhotos(30));
      } catch (e) {
        setError(e instanceof Error ? e.message : '갤러리를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const goEdit = () => {
    clearPlacedItems();
    navigation.navigate('Edit');
  };

  const onPick = async (asset: MediaLibrary.Asset) => {
    try {
      const uri = await resolveAssetUri(asset);
      setPhoto({ uri, width: asset.width, height: asset.height });
      goEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
    }
  };

  const onPickNative = async () => {
    try {
      const photo = await pickImageFromLibrary();
      if (!photo) return;
      setPhoto(photo);
      goEdit();
    } catch (e) {
      setError(e instanceof Error ? e.message : '사진을 불러오지 못했습니다.');
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={[styles.container, bounds]} edges={['top', 'bottom']}>
        <TopBar title="갤러리에서 선택" onBack={() => navigation.goBack()} />

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <Text style={styles.error}>{error}</Text>
            <PillButton label="사진 앱에서 선택" onPress={onPickNative} />
          </View>
        ) : assets.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.error}>바로 표시할 수 있는 사진이 없어요.</Text>
            <PillButton label="사진 앱에서 선택" onPress={onPickNative} />
          </View>
        ) : (
          <ScrollView contentContainerStyle={[styles.grid, { paddingHorizontal: gutter }]}>
            {assets.map((a) => (
              <Pressable key={a.id} style={{ width: cellWidth }} onPress={() => onPick(a)}>
                <Image source={{ uri: a.uri }} style={styles.photo} />
              </Pressable>
            ))}
            <View style={styles.nativePicker}>
              <PillButton label="사진 앱에서 다른 사진 선택" onPress={onPickNative} variant="outline" />
            </View>
          </ScrollView>
        )}
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  error: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  grid: {
    // paddingHorizontal은 화면 크기에 따라 런타임에 주입 (gutter)
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.tintPink,
  },
  nativePicker: {
    width: '100%',
    marginTop: spacing.md,
  },
});
