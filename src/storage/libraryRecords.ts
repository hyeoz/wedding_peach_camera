/**
 * AsyncStorage 에 들어가는 등록 이미지 레코드 ↔ 화면이 쓰는 LibraryItem 변환.
 *
 * 문서 디렉터리를 인자로 받는 순수 함수라 그대로 테스트할 수 있다.
 * "앱 업데이트하면 등록한 프레임·스티커가 사라진다"가 살던 자리가 여기라,
 * 네이티브 모듈 호출(userLibrary.ts)과 분리해 두고 이쪽을 검사한다.
 */
import type { LibraryItem } from '@/data/library';
import { toLibraryPath, toLibraryUri } from '@/storage/libraryPaths';

/** 저장되는 등록 이미지 한 건. */
export interface StoredImageItem {
  id: string;
  label: string;
  emoji: string;
  /** 문서 디렉터리 기준 상대 경로 (현재 형식). */
  path?: string;
  /** 예전 형식 — 절대 file:// URI. 읽기만 하고 다시 쓰지 않는다. */
  uri?: string;
}

const DEFAULT_IMAGE_EMOJI = '🖼️';

/**
 * 저장된 레코드를 지금 설치본 기준의 LibraryItem 으로 읽는다.
 * path(현재 형식)를 먼저 보고, 없으면 uri(예전 절대 경로)에서 되짚는다.
 * 알아볼 수 없는 항목은 버린다.
 */
export function readImageRecords(
  value: unknown,
  documentDirectory: string | undefined | null,
): LibraryItem[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return [];
    const record = entry as Partial<StoredImageItem>;
    if (typeof record.id !== 'string' || typeof record.label !== 'string') return [];

    const stored = typeof record.path === 'string' ? record.path : record.uri;
    const uri = toLibraryUri(stored, documentDirectory);
    if (!uri) return [];

    return [{ id: record.id, label: record.label, emoji: record.emoji || DEFAULT_IMAGE_EMOJI, uri }];
  });
}

/**
 * 예전 형식(절대 uri)으로 저장된 레코드가 섞여 있는지.
 *
 * 읽을 때마다 되짚기는 하지만, 한 번은 새 형식으로 다시 써 둬야 저장값에서
 * 낡은 컨테이너 경로가 사라진다. 그 판단에 쓴다.
 */
export function hasLegacyImageRecords(value: unknown): boolean {
  if (!Array.isArray(value)) return false;

  return value.some((entry) => {
    if (!entry || typeof entry !== 'object') return false;
    const record = entry as Partial<StoredImageItem>;
    return typeof record.path !== 'string' && typeof record.uri === 'string';
  });
}

/**
 * LibraryItem 을 저장용 레코드로 되돌린다.
 * 화면이 들고 있는 uri 는 이번 설치본의 절대 경로이므로 반드시 상대 경로로 줄인다.
 * 여기서 절대 경로가 새어 나가면 다음 업데이트 때 또 링크가 끊긴다.
 */
export function writeImageRecords(items: LibraryItem[]): StoredImageItem[] {
  return items.map(({ id, label, emoji, uri }) => ({
    id,
    label,
    emoji: emoji || DEFAULT_IMAGE_EMOJI,
    path: toLibraryPath(uri),
  }));
}
