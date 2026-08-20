/**
 * 사용자가 직접 등록한 프레임/스티커/텍스트 라이브러리 영속화.
 *
 * 이미지(프레임·스티커): 선택한 원본은 캐시에서 사라질 수 있으므로 앱 문서
 * 디렉터리로 복사하고, 메타데이터(id/이름/파일 경로)는 AsyncStorage에 저장한다.
 * 경로는 **문서 디렉터리 기준 상대 경로**로 저장한다 — 절대 URI를 저장하면
 * 앱 업데이트로 컨테이너 UUID가 바뀌는 순간 전부 깨진 링크가 된다(libraryPaths 참고).
 *
 * 텍스트: 파일이 필요 없어 DSL 원문(templateSource)을 그대로 AsyncStorage에 담는다.
 * 컴파일 결과가 아니라 원문을 저장하므로, 문법이 확장돼도 다시 컴파일만 하면 된다.
 *
 * 저장 키는 v1 을 유지한다. 정규화 함수가 없는 키에 빈 배열을 돌려주므로
 * text 를 추가해도 기존 사용자 데이터가 그대로 읽힌다(마이그레이션 불필요).
 * 절대 경로 → 상대 경로 전환도 읽을 때 흡수하므로 키를 올릴 필요가 없다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';

import type { ImageLibraryMode, LibraryItem, UserLibraryMode } from '@/data/library';
import { DEFAULT_CARD_EMOJI, type TextVariant } from '@/data/textTemplates';
import { LIBRARY_DIRNAME, isLibraryPath, toLibraryUri } from '@/storage/libraryPaths';
import {
  hasLegacyImageRecords,
  readImageRecords,
  writeImageRecords,
} from '@/storage/libraryRecords';

const KEY = '@wpc/user-library/v1';
const DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}${LIBRARY_DIRNAME}/`
  : null;

export type UserLibraryState = Record<UserLibraryMode, LibraryItem[]>;

export const EMPTY_USER_LIBRARY: UserLibraryState = { frame: [], sticker: [], text: [] };

interface StoredTextItem {
  id: string;
  label: string;
  emoji: string;
  templateSource: string;
  tint?: string;
  variant?: TextVariant;
  stampColor?: string;
}

/** 현재 설치본 기준으로 등록 이미지의 절대 URI를 만든다. */
export function libraryUri(pathOrUri: string | undefined | null): string | undefined {
  return toLibraryUri(pathOrUri, FileSystem.documentDirectory);
}

/**
 * 등록 이미지가 실제로 남아 있는지 확인해 없는 항목에 표시를 남긴다.
 *
 * 목록에서 지우지는 않는다. 조회에 실패했다고 사용자가 등록한 항목을 말없이
 * 없애 버리면 되돌릴 방법이 없기 때문이다. 표시만 하고 삭제는 사용자가 정한다.
 */
async function markMissingImages(items: LibraryItem[]): Promise<LibraryItem[]> {
  return Promise.all(
    items.map(async (item) => {
      if (!item.uri) return item;
      try {
        const info = await FileSystem.getInfoAsync(item.uri);
        return info.exists ? item : { ...item, missing: true };
      } catch {
        // 확인 자체가 실패한 경우는 판단을 보류하고 그대로 둔다.
        return item;
      }
    }),
  );
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
        // variant 가 생기기 전에 저장된 항목은 전부 카드형이다.
        variant: item.variant === 'stamp' ? 'stamp' : 'card',
        stampColor: typeof item.stampColor === 'string' ? item.stampColor : undefined,
      },
    ];
  });
}

export async function loadUserLibrary(): Promise<UserLibraryState> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return EMPTY_USER_LIBRARY;
    const parsed = JSON.parse(raw) as Partial<Record<UserLibraryMode, unknown>>;

    const documents = FileSystem.documentDirectory;
    const rawFrame = Array.isArray(parsed.frame) ? parsed.frame : [];
    const rawSticker = Array.isArray(parsed.sticker) ? parsed.sticker : [];

    const [frame, sticker] = await Promise.all([
      markMissingImages(readImageRecords(rawFrame, documents)),
      markMissingImages(readImageRecords(rawSticker, documents)),
    ]);

    const state: UserLibraryState = { frame, sticker, text: normalizeTextItems(parsed.text) };

    // 예전 형식이 남아 있으면 한 번만 새 형식으로 다시 써 둔다. 읽을 때마다 되짚기는
    // 하지만, 저장값에서 낡은 컨테이너 경로를 실제로 걷어내야 끝난 것이다.
    // 읽으면서 버린 레코드가 하나라도 있으면 건너뛴다 — 되쓰면 그 항목이 영영 사라진다.
    const nothingDropped = frame.length === rawFrame.length && sticker.length === rawSticker.length;
    if (nothingDropped && (hasLegacyImageRecords(rawFrame) || hasLegacyImageRecords(rawSticker))) {
      void saveUserLibrary(state).catch(() => {});
    }

    return state;
  } catch {
    return EMPTY_USER_LIBRARY;
  }
}

export async function saveUserLibrary(state: UserLibraryState): Promise<void> {
  const toImage = (mode: ImageLibraryMode) => writeImageRecords(state[mode]);

  const serializable = {
    frame: toImage('frame'),
    sticker: toImage('sticker'),
    text: state.text.map(({ id, label, emoji, templateSource, tint, variant, stampColor }) => ({
      id,
      label,
      emoji,
      templateSource: templateSource ?? '',
      tint,
      variant,
      stampColor,
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

/**
 * 고른 이미지를 앱 문서 디렉터리로 복사한다.
 *
 * 캐시가 아니라 Documents 인 이유: 캐시는 저장 공간이 부족하면 OS 가 임의로 비운다.
 * 백업에서도 빼지 않는다 — 사용자가 직접 만든 원본이라 다시 받아올 수 없고,
 * Apple 이 백업 제외를 요구하는 건 "다시 내려받을 수 있는 데이터"뿐이다.
 *
 * 돌려주는 건 지금 이 설치본의 절대 URI다. 저장할 때 상대 경로로 바뀐다.
 */
export async function persistLibraryImage(sourceUri: string, id: string): Promise<string> {
  if (!DIRECTORY) throw new Error('이 기기에서는 등록 이미지를 저장할 수 없습니다.');
  await FileSystem.makeDirectoryAsync(DIRECTORY, { intermediates: true });
  const destination = `${DIRECTORY}${id}.${extensionOf(sourceUri)}`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

/**
 * 등록 이미지 파일을 지운다.
 * 예전 설치본의 절대 경로가 들어와도 지금 경로로 되짚어 지운다 —
 * 경로 비교만으로 걸러내면 업데이트 전에 등록한 파일이 지워지지 않고 계속 쌓인다.
 */
export async function removeLibraryImage(pathOrUri: string): Promise<void> {
  if (!isLibraryPath(pathOrUri)) return;
  const uri = libraryUri(pathOrUri);
  if (!uri) return;
  await FileSystem.deleteAsync(uri, { idempotent: true });
}
