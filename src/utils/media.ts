/**
 * 미디어 관련 헬퍼 (권한/불러오기/저장/공유).
 * 화면이 expo 모듈 세부사항을 직접 다루지 않도록 얇게 감싼다.
 */
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';

import type { Photo } from '@/types';
import { resolveTakenAt } from '@/utils/exif';

/**
 * 저장 전용 앨범 이름. 사진 앱에 그대로 노출되므로 앱 표시 이름과 같게 둔다.
 * 바꾸면 이전 이름으로 만들어진 앨범은 그 자리에 남고 새 앨범이 따로 생긴다.
 */
const ALBUM = '웨피캠';

/** 네이티브 이미지 피커로 사진 1장 선택 (갤러리 화면 폴백/대안). */
export async function pickImageFromLibrary(): Promise<Photo | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) throw new Error('사진 접근 권한이 필요합니다.');

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
    // 타임스탬프 텍스트가 쓸 원본 촬영 일시를 함께 받는다.
    exif: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const a = result.assets[0];
  const taken = resolveTakenAt({ exif: a.exif });
  return {
    uri: a.uri,
    width: a.width,
    height: a.height,
    takenAt: taken.value,
    takenAtSource: taken.source,
  };
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

  // iOS의 `ph://`는 Photos 내부 식별자라 React Native Image가 직접 표시하지 못한다.
  // 썸네일을 렌더링하기 전에 실제 로컬 URI로 바꾸고, 변환할 수 없는 항목은
  // 시스템 사진 선택기에서 고를 수 있도록 인앱 목록에서는 제외한다.
  const resolvedAssets = await Promise.all(
    res.assets.map(async (asset) => {
      const uri = await resolveAssetUri(asset);
      return uri.startsWith('ph://') ? null : { ...asset, uri };
    }),
  );

  return resolvedAssets.filter((asset): asset is MediaLibrary.Asset => asset !== null);
}

/** MediaLibrary 에셋을 합성/저장에 안전한 로컬 file:// uri로 변환. */
export async function resolveAssetUri(asset: MediaLibrary.Asset): Promise<string> {
  if (!asset.uri.startsWith('ph://')) return asset.uri;

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
