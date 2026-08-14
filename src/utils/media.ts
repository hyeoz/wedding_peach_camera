/**
 * 미디어 관련 헬퍼 (권한/불러오기/저장/공유).
 * 화면이 expo 모듈 세부사항을 직접 다루지 않도록 얇게 감싼다.
 */
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import type { Photo } from '@/types';

const ALBUM = 'Wedding Peach Camera';

/** 네이티브 이미지 피커로 사진 1장 선택 (갤러리 화면 폴백/대안). */
export async function pickImageFromLibrary(): Promise<Photo | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('사진 접근 권한이 필요합니다.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  return { uri: a.uri, width: a.width, height: a.height };
}

/** 기기 갤러리 최근 사진들을 불러온다 (인앱 그리드용). */
export async function loadRecentPhotos(count = 30): Promise<MediaLibrary.Asset[]> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) throw new Error('사진 접근 권한이 필요합니다.');

  const res = await MediaLibrary.getAssetsAsync({
    first: count,
    mediaType: 'photo',
    sortBy: [[MediaLibrary.SortBy.creationTime, false]],
  });
  return res.assets;
}

/** MediaLibrary 에셋을 합성/저장에 안전한 로컬 file:// uri로 변환. */
export async function resolveAssetUri(asset: MediaLibrary.Asset): Promise<string> {
  try {
    const info = await MediaLibrary.getAssetInfoAsync(asset);
    return info.localUri ?? asset.uri;
  } catch {
    return asset.uri;
  }
}

/** 합성 결과 이미지를 갤러리(전용 앨범)에 저장한다. */
export async function saveToGallery(fileUri: string): Promise<void> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) throw new Error('저장을 위해 사진 접근 권한이 필요합니다.');

  const asset = await MediaLibrary.createAssetAsync(fileUri);
  try {
    const album = await MediaLibrary.getAlbumAsync(ALBUM);
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync(ALBUM, asset, false);
    }
  } catch {
    // 앨범 정리 실패해도 저장 자체는 성공으로 간주.
  }
}

/** 결과 이미지를 시스템 공유 시트로 공유한다. */
export async function shareImage(fileUri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('이 기기에서는 공유를 사용할 수 없습니다.');
  await Sharing.shareAsync(fileUri);
}
