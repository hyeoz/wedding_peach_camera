/** 사용자가 등록한 프레임/스티커 이미지와 텍스트 템플릿을 관리한다. */
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
  type ImageLibraryMode,
  type LibraryItem,
  type OverlayMode,
  type UserLibraryMode,
} from '@/data/library';
import { parseTemplateSource } from '@/data/textTemplateParser';
import {
  DEFAULT_CARD_TINT,
  findBuiltInTemplate,
  type TextTemplate,
} from '@/data/textTemplates';
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
  /** 텍스트 카드 렌더에 쓰는 템플릿 조회 (내장 + 사용자 등록). */
  getTemplate: (id: string) => TextTemplate | undefined;
  addItem: (mode: ImageLibraryMode, label: string, sourceUri: string) => Promise<LibraryItem>;
  addTextItem: (label: string, templateSource: string, tint: string) => Promise<LibraryItem>;
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
    (mode: OverlayMode) =>
      // 텍스트만 내장 항목이 있어서 사용자 등록분을 뒤에 이어 붙인다.
      mode === 'text' ? [...getBuiltInItems('text'), ...items.text] : items[mode],
    [items],
  );

  const getItem = useCallback(
    (mode: OverlayMode, id: string) => getItems(mode).find((item) => item.id === id),
    [getItems],
  );

  /**
   * 저장된 것은 DSL 원문이므로 조회 시점에 컴파일한다.
   * 카드 한 장을 그릴 때마다 파싱하지만 줄 수가 12줄 이하라 비용이 미미하고,
   * 파서가 개선되면 저장 데이터를 건드리지 않고도 결과가 따라 좋아진다.
   */
  const getTemplate = useCallback(
    (id: string): TextTemplate | undefined => {
      const builtIn = findBuiltInTemplate(id);
      if (builtIn) return builtIn;

      const item = items.text.find((entry) => entry.id === id);
      if (!item?.templateSource) return undefined;

      const { template } = parseTemplateSource(item.templateSource, {
        id: item.id,
        label: item.label,
        tint: item.tint ?? DEFAULT_CARD_TINT,
        emoji: item.emoji,
      });
      return template ?? undefined;
    },
    [items.text],
  );

  const addItem = useCallback(
    async (mode: ImageLibraryMode, label: string, sourceUri: string) => {
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

  const addTextItem = useCallback(
    async (label: string, templateSource: string, tint: string) => {
      const id = `text-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      // 저장 전에 컴파일해 본다. 깨진 템플릿이 목록에 남지 않게 하기 위함.
      const { errors } = parseTemplateSource(templateSource, { id, label, tint });
      if (errors.length > 0) throw new Error(errors[0]);

      const item: LibraryItem = {
        id,
        label: label.trim(),
        emoji: '📝',
        templateSource,
        tint,
      };
      const next = { ...items, text: [...items.text, item] };
      await saveUserLibrary(next);
      setItems(next);
      return item;
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
    () => ({ items, ready, getItems, getItem, getTemplate, addItem, addTextItem, removeItem }),
    [items, ready, getItems, getItem, getTemplate, addItem, addTextItem, removeItem],
  );

  return <UserLibraryContext.Provider value={value}>{children}</UserLibraryContext.Provider>;
}

export function useUserLibrary(): UserLibraryContextValue {
  const ctx = useContext(UserLibraryContext);
  if (!ctx) throw new Error('useUserLibrary must be used within a UserLibraryProvider');
  return ctx;
}
