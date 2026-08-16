/**
 * 사용자가 직접 등록한 프레임/스티커 라이브러리 영속화.
 *
 * 선택한 원본은 캐시에서 사라질 수 있으므로 앱 문서 디렉터리로 복사하고,
 * 항목 메타데이터(id/이름/파일 URI)는 AsyncStorage에 저장한다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

import type { LibraryItem, UserLibraryMode } from '@/data/library';

const KEY = '@wpc/user-library/v1';
const DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}user-library/`
  : null;

export type UserLibraryState = Record<UserLibraryMode, LibraryItem[]>;

export const EMPTY_USER_LIBRARY: UserLibraryState = { frame: [], sticker: [] };

interface StoredLibraryItem {
  id: string;
  label: string;
  emoji: string;
  uri: string;
}

function normalizeItems(value: unknown): LibraryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<StoredLibraryItem>;
    if (
      typeof item.id !== 'string' ||
      typeof item.label !== 'string' ||
      typeof item.uri !== 'string'
    ) {
      return [];
    }
    return [{ id: item.id, label: item.label, emoji: item.emoji || '🖼️', uri: item.uri }];
  });
}

export async function loadUserLibrary(): Promise<UserLibraryState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_USER_LIBRARY;
    const parsed = JSON.parse(raw) as Partial<Record<UserLibraryMode, unknown>>;
    return {
      frame: normalizeItems(parsed.frame),
      sticker: normalizeItems(parsed.sticker),
    };
  } catch {
    return EMPTY_USER_LIBRARY;
  }
}

export async function saveUserLibrary(state: UserLibraryState): Promise<void> {
  const serializable: Record<UserLibraryMode, StoredLibraryItem[]> = {
    frame: state.frame.map(({ id, label, emoji, uri }) => ({ id, label, emoji, uri: uri ?? '' })),
    sticker: state.sticker.map(({ id, label, emoji, uri }) => ({ id, label, emoji, uri: uri ?? '' })),
  };
  await AsyncStorage.setItem(KEY, JSON.stringify(serializable));
}

function extensionOf(uri: string): string {
  const path = uri.split(/[?#]/, 1)[0];
  const extension = path.match(/\.([a-zA-Z0-9]{2,5})$/)?.[1]?.toLowerCase();
  return extension && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(extension)
    ? extension
    : 'jpg';
}

export async function persistLibraryImage(sourceUri: string, id: string): Promise<string> {
  if (!DIRECTORY) throw new Error('이 기기에서는 등록 이미지를 저장할 수 없습니다.');
  await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
  const destination = `${DIRECTORY}${id}.${extensionOf(sourceUri)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function removeLibraryImage(uri: string): Promise<void> {
  if (!DIRECTORY || !uri.startsWith(DIRECTORY)) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
