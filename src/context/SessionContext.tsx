/**
 * 편집 세션 전역 상태.
 *
 * - mode: 프레임 / 스티커 / 텍스트
 * - selectedFrameId(프레임 단일) / selectedItemIds(스티커·텍스트 다중)
 * - favorites: AsyncStorage 영속화 (3개 모드)
 * - placedItems / activeItemId: 편집 캔버스 상태 (이미지 스티커 + 텍스트 카드)
 * - photo: 촬영/선택 사진, resultUri: 캡처된 결과 이미지
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import type { OverlayMode, UserLibraryMode } from '@/data/library';
import {
  loadFavorites,
  saveFavorites,
  toggleFavorite as toggleFavoriteState,
  type FavoriteState,
} from '@/storage/favorites';
import type { PlacedItem, Photo } from '@/types';

/** 배치 항목을 추가할 때 기본값 대신 지정할 수 있는 값들. */
export type PlacedItemInit = Partial<Omit<PlacedItem, 'id' | 'refId'>>;

/**
 * 프레임은 항상 스티커·텍스트 위에 보이도록 배열 끝으로 보낸다.
 * (같은 종류끼리의 순서는 그대로 유지된다.)
 */
function withFrameOnTop(items: PlacedItem[]): PlacedItem[] {
  const frames = items.filter((item) => item.kind === 'frame');
  if (frames.length === 0) return items;
  return [...items.filter((item) => item.kind !== 'frame'), ...frames];
}

interface SessionContextValue {
  mode: OverlayMode;
  selectedFrameId: string | null;
  selectedItemIds: string[];
  favorites: FavoriteState;
  placedItems: PlacedItem[];
  activeItemId: string | null;
  photo: Photo | null;
  resultUri: string | null;

  setMode: (mode: OverlayMode) => void;
  selectFrame: (id: string) => void;
  toggleItemChoice: (id: string) => void;
  toggleFavorite: (mode: OverlayMode, id: string) => void;
  forgetLibraryItem: (mode: UserLibraryMode, id: string) => void;

  addPlacedItem: (refId: string, init?: PlacedItemInit) => void;
  updatePlacedItem: (id: string, patch: Partial<PlacedItem>) => void;
  deletePlacedItem: (id: string) => void;
  setActiveItem: (id: string | null) => void;
  clearPlacedItems: () => void;

  setPhoto: (photo: Photo | null) => void;
  setResultUri: (uri: string | null) => void;
  reset: () => void;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<OverlayMode>('frame');
  const [selectedFrameId, setSelectedFrameId] = useState<string | null>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<FavoriteState>({ frame: [], sticker: [], text: [] });
  const [placedItems, setPlacedItems] = useState<PlacedItem[]>([]);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [resultUri, setResultUri] = useState<string | null>(null);

  const placedCounter = useRef(0);

  useEffect(() => {
    loadFavorites().then(setFavorites);
  }, []);

  const setMode = useCallback((next: OverlayMode) => {
    setModeState(next);
    setSelectedFrameId(null);
    setSelectedItemIds([]);
  }, []);

  const selectFrame = useCallback((id: string) => setSelectedFrameId(id), []);

  const toggleItemChoice = useCallback((id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const toggleFavorite = useCallback((favMode: OverlayMode, id: string) => {
    setFavorites((prev) => {
      const next = toggleFavoriteState(prev, favMode, id);
      saveFavorites(next);
      return next;
    });
  }, []);

  /** 사용자 라이브러리에서 삭제된 항목을 현재 선택/즐겨찾기/캔버스에서도 제거한다. */
  const forgetLibraryItem = useCallback((itemMode: UserLibraryMode, id: string) => {
    if (itemMode === 'frame') {
      setSelectedFrameId((current) => (current === id ? null : current));
    } else {
      setSelectedItemIds((current) => current.filter((itemId) => itemId !== id));
    }

    // 캔버스에 이미 올려둔 항목도 같이 치운다. 남겨두면 원본이 사라져
    // 프레임·스티커는 빈 칸으로, 텍스트 카드는 아예 렌더되지 않는 유령이 된다.
    const orphanIds = placedItems.filter((placed) => placed.refId === id).map((p) => p.id);
    if (orphanIds.length > 0) {
      setPlacedItems((current) => current.filter((placed) => placed.refId !== id));
      setActiveItemId((current) => (current && orphanIds.includes(current) ? null : current));
    }

    setFavorites((prev) => {
      if (!prev[itemMode].includes(id)) return prev;
      const next = { ...prev, [itemMode]: prev[itemMode].filter((itemId) => itemId !== id) };
      saveFavorites(next);
      return next;
    });
  }, [placedItems]);

  /**
   * 캔버스에 항목을 올린다.
   * 기본 위치는 캔버스 대비 비율이라 화면 크기와 무관하게 같은 자리에 놓인다.
   * 프레임처럼 계산된 시작값이 필요한 경우 `init` 으로 덮어쓴다.
   */
  const addPlacedItem = useCallback(
    (refId: string, init?: PlacedItemInit) => {
      placedCounter.current += 1;
      const n = placedCounter.current;
      const id = `p${n}`;
      const isText = mode === 'text';
      const item: PlacedItem = {
        id,
        kind: isText ? 'text' : 'sticker',
        refId,
        x: (isText ? 0.1 : 0.3) + (n % 3) * (isText ? 0.045 : 0.07),
        y: 0.25 + (n % 4) * 0.045,
        scale: 1,
        rotation: 0,
        choices: {},
        notes: {},
        ...init,
      };
      setPlacedItems((prev) => withFrameOnTop([...prev, item]));
      setActiveItemId(id);
    },
    [mode],
  );

  const updatePlacedItem = useCallback((id: string, patch: Partial<PlacedItem>) => {
    setPlacedItems((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const deletePlacedItem = useCallback((id: string) => {
    setPlacedItems((prev) => prev.filter((p) => p.id !== id));
    setActiveItemId((cur) => (cur === id ? null : cur));
  }, []);

  const setActiveItem = useCallback((id: string | null) => setActiveItemId(id), []);

  const clearPlacedItems = useCallback(() => {
    setPlacedItems([]);
    setActiveItemId(null);
  }, []);

  const reset = useCallback(() => {
    setModeState('frame');
    setSelectedFrameId(null);
    setSelectedItemIds([]);
    setPlacedItems([]);
    setActiveItemId(null);
    setPhoto(null);
    setResultUri(null);
    placedCounter.current = 0;
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      mode,
      selectedFrameId,
      selectedItemIds,
      favorites,
      placedItems,
      activeItemId,
      photo,
      resultUri,
      setMode,
      selectFrame,
      toggleItemChoice,
      toggleFavorite,
      forgetLibraryItem,
      addPlacedItem,
      updatePlacedItem,
      deletePlacedItem,
      setActiveItem,
      clearPlacedItems,
      setPhoto,
      setResultUri,
      reset,
    }),
    [
      mode,
      selectedFrameId,
      selectedItemIds,
      favorites,
      placedItems,
      activeItemId,
      photo,
      resultUri,
      setMode,
      selectFrame,
      toggleItemChoice,
      toggleFavorite,
      forgetLibraryItem,
      addPlacedItem,
      updatePlacedItem,
      deletePlacedItem,
      setActiveItem,
      clearPlacedItems,
      reset,
    ],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
