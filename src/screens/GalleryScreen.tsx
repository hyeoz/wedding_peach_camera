import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type * as MediaLibrary from 'expo-media-library';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GradientBackground } from '@/components/GradientBackground';
import { PillButton } from '@/components/PillButton';
import { TopBar } from '@/components/TopBar';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import { colors, fonts, spacing } from '@/theme';
import { loadRecentPhotos, pickImageFromLibrary, resolveAssetUri } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Gallery'>;

export function GalleryScreen({ navigation }: Props) {
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
    const uri = await resolveAssetUri(asset);
    setPhoto({ uri, width: asset.width, height: asset.height });
    goEdit();
  };

  const onPickNative = async () => {
    const photo = await pickImageFromLibrary();
    if (!photo) return;
    setPhoto(photo);
    goEdit();
  };

  return (
    <GradientBackground>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
        ) : (
          <View style={styles.grid}>
            {assets.map((a) => (
              <Pressable key={a.id} style={styles.cell} onPress={() => onPick(a)}>
                <Image source={{ uri: a.uri }} style={styles.photo} />
              </Pressable>
            ))}
          </View>
        )}
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  cell: {
    width: `${(100 - 4) / 3}%`,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 10,
    backgroundColor: colors.tintPink,
  },
});
