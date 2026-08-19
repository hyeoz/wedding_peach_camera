/**
 * 사용자가 직접 등록한 프레임/스티커/텍스트 라이브러리 영속화.
 *
 * 이미지(프레임·스티커): 선택한 원본은 캐시에서 사라질 수 있으므로 앱 문서
 * 디렉터리로 복사하고, 메타데이터(id/이름/파일 URI)는 AsyncStorage에 저장한다.
 *
 * 텍스트: 파일이 필요 없어 DSL 원문(templateSource)을 그대로 AsyncStorage에 담는다.
 * 컴파일 결과가 아니라 원문을 저장하므로, 문법이 확장돼도 다시 컴파일만 하면 된다.
 *
 * 저장 키는 v1 을 유지한다. 정규화 함수가 없는 키에 빈 배열을 돌려주므로
 * text 를 추가해도 기존 사용자 데이터가 그대로 읽힌다(마이그레이션 불필요).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import type { ImageLibraryMode, LibraryItem, UserLibraryMode } from '@/data/library';
import { DEFAULT_CARD_EMOJI } from '@/data/textTemplates';

const KEY = '@wpc/user-library/v1';
const DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}user-library/`
  : null;

export type UserLibraryState = Record<UserLibraryMode, LibraryItem[]>;

export const EMPTY_USER_LIBRARY: UserLibraryState = { frame: [], sticker: [], text: [] };

interface StoredImageItem {
  id: string;
  label: string;
  emoji: string;
  uri: string;
}

interface StoredTextItem {
  id: string;
  label: string;
  emoji: string;
  templateSource: string;
  tint?: string;
}

function normalizeImageItems(value: unknown): LibraryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<StoredImageItem>;
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

function normalizeTextItems(value: unknown): LibraryItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const item = entry as Partial<StoredTextItem>;
    if (
      typeof item.id !== 'string' ||
      typeof item.label !== 'string' ||
      typeof item.templateSource !== 'string'
    ) {
      return [];
    }
    return [
      {
        id: item.id,
        label: item.label,
        // 이모지 선택 기능이 생기기 전에 저장된 항목에는 emoji 가 없다.
        emoji: item.emoji || DEFAULT_CARD_EMOJI,
        templateSource: item.templateSource,
        tint: typeof item.tint === 'string' ? item.tint : undefined,
      },
    ];
  });
}

export async function loadUserLibrary(): Promise<UserLibraryState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_USER_LIBRARY;
    const parsed = JSON.parse(raw) as Partial<Record<UserLibraryMode, unknown>>;
    return {
      frame: normalizeImageItems(parsed.frame),
      sticker: normalizeImageItems(parsed.sticker),
      text: normalizeTextItems(parsed.text),
    };
  } catch {
    return EMPTY_USER_LIBRARY;
  }
}

export async function saveUserLibrary(state: UserLibraryState): Promise<void> {
  const toImage = (mode: ImageLibraryMode): StoredImageItem[] =>
    state[mode].map(({ id, label, emoji, uri }) => ({ id, label, emoji, uri: uri ?? '' }));

  const serializable = {
    frame: toImage('frame'),
    sticker: toImage('sticker'),
    text: state.text.map(({ id, label, emoji, templateSource, tint }) => ({
      id,
      label,
      emoji,
      templateSource: templateSource ?? '',
      tint,
    })),
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
