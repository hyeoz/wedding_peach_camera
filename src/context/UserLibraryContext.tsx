/** 사용자가 등록한 프레임/스티커 목록과 이미지 파일을 관리한다. */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  getBuiltInItems,
  type LibraryItem,
  type OverlayMode,
  type UserLibraryMode,
} from '@/data/library';
import {
  EMPTY_USER_LIBRARY,
  loadUserLibrary,
  persistLibraryImage,
  removeLibraryImage,
  saveUserLibrary,
  type UserLibraryState,
} from '@/storage/userLibrary';

interface UserLibraryContextValue {
  items: UserLibraryState;
  ready: boolean;
  getItems: (mode: OverlayMode) => LibraryItem[];
  getItem: (mode: OverlayMode, id: string) => LibraryItem | undefined;
  addItem: (mode: UserLibraryMode, label: string, sourceUri: string) => Promise<LibraryItem>;
  removeItem: (mode: UserLibraryMode, id: string) => Promise<void>;
}

const UserLibraryContext = createContext<UserLibraryContextValue | undefined>(undefined);

export function UserLibraryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<UserLibraryState>(EMPTY_USER_LIBRARY);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadUserLibrary()
      .then(setItems)
      .finally(() => setReady(true));
  }, []);

  const getItems = useCallback(
    (mode: OverlayMode) => (mode === 'text' ? getBuiltInItems('text') : items[mode]),
    [items],
  );

  const getItem = useCallback(
    (mode: OverlayMode, id: string) => getItems(mode).find((item) => item.id === id),
    [getItems],
  );

  const addItem = useCallback(
    async (mode: UserLibraryMode, label: string, sourceUri: string) => {
      const id = `${mode}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const uri = await persistLibraryImage(sourceUri, id);
      const item: LibraryItem = {
        id,
        label: label.trim(),
        emoji: mode === 'frame' ? '🖼️' : '✨',
        uri,
      };
      const next = { ...items, [mode]: [...items[mode], item] };
      try {
        await saveUserLibrary(next);
        setItems(next);
        return item;
      } catch (error) {
        await removeLibraryImage(uri).catch(() => {});
        throw error;
      }
    },
    [items],
  );

  const removeItem = useCallback(
    async (mode: UserLibraryMode, id: string) => {
      const target = items[mode].find((item) => item.id === id);
      const next = { ...items, [mode]: items[mode].filter((item) => item.id !== id) };
      await saveUserLibrary(next);
      setItems(next);
      if (target?.uri) await removeLibraryImage(target.uri).catch(() => {});
    },
    [items],
  );

  const value = useMemo<UserLibraryContextValue>(
    () => ({ items, ready, getItems, getItem, addItem, removeItem }),
    [items, ready, getItems, getItem, addItem, removeItem],
  );

  return <UserLibraryContext.Provider value={value}>{children}</UserLibraryContext.Provider>;
}

export function useUserLibrary(): UserLibraryContextValue {
  const ctx = useContext(UserLibraryContext);
  if (!ctx) throw new Error('useUserLibrary must be used within a UserLibraryProvider');
  return ctx;
}
