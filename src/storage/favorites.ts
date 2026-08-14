/**
 * 즐겨찾기(프레임/스티커) 영속화 계층.
 * AsyncStorage에 JSON 배열로 저장한다.
 *
 * 주의: 여기서는 이미지 uri를 그대로 저장한다. 갤러리에서 고른 임시 uri는
 * 시간이 지나면 만료될 수 있으므로, 실제 앱에서는 선택한 이미지를
 * expo-file-system으로 앱 전용 디렉터리에 복사한 뒤 그 경로를 저장하는 것을
 * 권장한다. (copyAssetToAppDir 헬퍼 참고)
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { FavoriteOverlay, OverlayAsset, OverlayMode } from '@/types';

const STORAGE_KEY = '@wpc/favorites/v1';

async function readAll(): Promise<FavoriteOverlay[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FavoriteOverlay[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeAll(items: FavoriteOverlay[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** 특정 모드(프레임/스티커)의 즐겨찾기만 최신순으로 반환. */
export async function getFavorites(mode?: OverlayMode): Promise<FavoriteOverlay[]> {
  const all = await readAll();
  const filtered = mode ? all.filter((f) => f.mode === mode) : all;
  return filtered.sort((a, b) => b.createdAt - a.createdAt);
}

/** 즐겨찾기 추가. 동일 uri가 이미 있으면 중복 저장하지 않는다. */
export async function addFavorite(asset: OverlayAsset): Promise<FavoriteOverlay> {
  const all = await readAll();
  const existing = all.find((f) => f.uri === asset.uri && f.mode === asset.mode);
  if (existing) return existing;

  const favorite: FavoriteOverlay = { ...asset, createdAt: Date.now() };
  await writeAll([favorite, ...all]);
  return favorite;
}

/** id로 즐겨찾기 삭제. */
export async function removeFavorite(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((f) => f.id !== id));
}

/** 해당 uri가 이미 즐겨찾기에 있는지 확인. */
export async function isFavorite(uri: string, mode: OverlayMode): Promise<boolean> {
  const all = await readAll();
  return all.some((f) => f.uri === uri && f.mode === mode);
}
