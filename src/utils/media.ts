/**
 * 이미지 불러오기 / 파일 복사 / 저장 관련 헬퍼.
 * 화면 코드가 expo 모듈 세부사항을 직접 다루지 않도록 얇게 감싼다.
 */
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import * as MediaLibrary from 'expo-media-library';

import type { OverlayAsset, OverlayMode, Photo } from '@/types';
import { createId } from '@/utils/id';

/** 즐겨찾기용 이미지를 앱 전용 디렉터리에 복사해 영구 uri를 확보한다. */
const OVERLAY_DIR = `${FileSystem.documentDirectory}overlays/`;

async function ensureOverlayDir(): Promise<void> {
  const info = await FileSystem.getInfoAsync(OVERLAY_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(OVERLAY_DIR, { intermediates: true });
  }
}

/**
 * 임시 uri(갤러리/파일에서 고른 결과)를 앱 디렉터리에 복사한다.
 * 즐겨찾기처럼 오래 보관할 이미지는 반드시 이 함수를 거쳐 저장한다.
 */
export async function persistOverlayImage(sourceUri: string): Promise<string> {
  await ensureOverlayDir();
  const extMatch = sourceUri.match(/\.(\w+)(?:\?.*)?$/);
  const ext = extMatch ? extMatch[1] : 'png';
  const dest = `${OVERLAY_DIR}${createId('img')}.${ext}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  return dest;
}

/** 갤러리에서 이미지 1장을 고른다. 취소 시 null. */
export async function pickImageFromLibrary(): Promise<Photo | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('사진 접근 권한이 필요합니다.');
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, width: asset.width, height: asset.height };
}

/** 파일 시스템(문서/다운로드 등)에서 이미지를 고른다. 취소 시 null. */
export async function pickImageFromFiles(): Promise<Photo | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'image/*',
    copyToCacheDirectory: true,
  });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  return { uri: asset.uri };
}

/**
 * 오버레이(프레임/스티커) 선택 결과를 OverlayAsset으로 변환.
 * persist=true면 앱 디렉터리에 복사해 영구 경로를 사용한다(즐겨찾기 대비).
 */
export async function toOverlayAsset(
  photo: Photo,
  mode: OverlayMode,
  options: { persist?: boolean; name?: string } = {},
): Promise<OverlayAsset> {
  const uri = options.persist ? await persistOverlayImage(photo.uri) : photo.uri;
  const aspectRatio =
    photo.width && photo.height ? photo.width / photo.height : undefined;
  return {
    id: createId(mode),
    uri,
    mode,
    name: options.name,
    aspectRatio,
  };
}

/** 합성 결과 이미지를 카메라 롤(갤러리)에 저장한다. */
export async function saveToGallery(fileUri: string): Promise<void> {
  const perm = await MediaLibrary.requestPermissionsAsync();
  if (!perm.granted) {
    throw new Error('저장을 위해 사진 접근 권한이 필요합니다.');
  }
  const asset = await MediaLibrary.createAssetAsync(fileUri);
  // "Wedding Peach Camera" 앨범으로 모아둔다.
  try {
    const album = await MediaLibrary.getAlbumAsync('Wedding Peach Camera');
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync('Wedding Peach Camera', asset, false);
    }
  } catch {
    // 앨범 정리에 실패해도 저장 자체는 성공한 것으로 간주.
  }
}
