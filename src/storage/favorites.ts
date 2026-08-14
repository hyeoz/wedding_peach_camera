/**
 * 즐겨찾기 영속화.
 * 프레임/스티커/텍스트 라이브러리 id 배열을 AsyncStorage에 저장한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { OverlayMode } from '@/data/library';

const KEY = '@wpc/favorites/v3';

export type FavoriteState = Record<OverlayMode, string[]>;

const EMPTY: FavoriteState = { frame: [], sticker: [], text: [] };

export async function loadFavorites(): Promise<FavoriteState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<FavoriteState>;
    return {
      frame: Array.isArray(parsed.frame) ? parsed.frame : [],
      sticker: Array.isArray(parsed.sticker) ? parsed.sticker : [],
      text: Array.isArray(parsed.text) ? parsed.text : [],
    };
  } catch {
    return EMPTY;
  }
}

export async function saveFavorites(state: FavoriteState): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 저장 실패는 조용히 무시 (다음 변경 때 재시도).
  }
}

/** 순수 함수: 해당 모드의 id 목록에서 토글한 새 상태 반환. */
export function toggleFavorite(
  state: FavoriteState,
  mode: OverlayMode,
  id: string,
): FavoriteState {
  const list = state[mode];
  const next = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  return { ...state, [mode]: next };
}
