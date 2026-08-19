/**
 * 사진 촬영 일시(EXIF) 해석.
 *
 * 타임스탬프 텍스트에 쓸 "이 사진이 찍힌 시각"을 구한다.
 * EXIF 가 없는 사진(스크린샷, 메신저로 받은 이미지 등)이 흔하므로
 * 항상 폴백 체인을 거쳐 값을 만들어 낸다.
 */

/** 촬영 시각을 어디서 얻었는지. 폴백을 UI 에서 구분해 안내할 때 쓴다. */
export type TakenAtSource = 'exif' | 'assetCreation' | 'now';

export interface TakenAt {
  /** epoch ms */
  value: number;
  source: TakenAtSource;
}

/**
 * EXIF 의 날짜 문자열은 "2026:08:19 14:23:05" 형태다.
 * 연·월·일 구분자가 콜론이라 Date 생성자가 파싱하지 못하므로 직접 뜯는다.
 * 시간대 정보가 없으므로 촬영지의 벽시계 시각으로 간주해 로컬 시간으로 만든다.
 * (필름 카메라 각인과 같은 동작이다. UTC 로 바꾸면 오히려 어긋난다.)
 */
const EXIF_DATE_RE = /^(\d{4})[:-](\d{2})[:-](\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;

export function parseExifDateString(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const m = value.trim().match(EXIF_DATE_RE);
  if (!m) return null;

  const [, y, mo, d, h, mi, s] = m;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
  );
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

/**
 * EXIF 객체에서 촬영 일시를 찾는다.
 *
 * 키 이름이 플랫폼·라이브러리 버전마다 갈린다. iOS 는 `{Exif}` 하위 딕셔너리에
 * 넣어 주기도 하고, 안드로이드는 평평한 키를 쓴다. 촬영 시각에 가까운 것부터
 * 순서대로 훑는다.
 */
const EXIF_DATE_KEYS = [
  'DateTimeOriginal',
  'DateTimeDigitized',
  'DateTime',
  'CreateDate',
] as const;

export function exifTakenAt(exif: unknown): number | null {
  if (!exif || typeof exif !== 'object') return null;
  const root = exif as Record<string, unknown>;

  // iOS 가 중첩해 주는 경우까지 포함해 탐색 대상을 모은다.
  const scopes: Record<string, unknown>[] = [root];
  for (const nested of ['{Exif}', 'Exif', '{TIFF}', 'TIFF']) {
    const value = root[nested];
    if (value && typeof value === 'object') scopes.push(value as Record<string, unknown>);
  }

  for (const scope of scopes) {
    for (const key of EXIF_DATE_KEYS) {
      const parsed = parseExifDateString(scope[key]);
      if (parsed !== null) return parsed;
    }
  }
  return null;
}

/**
 * 촬영 시각 확정. EXIF → 앨범 등록 시각 → 현재 시각 순으로 떨어진다.
 * `assetCreationTime` 은 expo-media-library 의 Asset.creationTime(ms).
 */
export function resolveTakenAt(options: {
  exif?: unknown;
  assetCreationTime?: number | null;
}): TakenAt {
  const fromExif = exifTakenAt(options.exif);
  if (fromExif !== null) return { value: fromExif, source: 'exif' };

  const creation = options.assetCreationTime;
  if (typeof creation === 'number' && Number.isFinite(creation) && creation > 0) {
    // 일부 플랫폼이 초 단위로 주는 경우가 있어 자릿수로 구분한다.
    const ms = creation < 1e12 ? creation * 1000 : creation;
    return { value: ms, source: 'assetCreation' };
  }

  return { value: Date.now(), source: 'now' };
}

// ─── 포맷 ────────────────────────────────────────────────────────────────

const pad = (n: number) => `${n}`.padStart(2, '0');

/** 2026.08.19 */
export function formatShotDate(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
}

/** 14:23:05 */
export function formatShotTime(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** 2026.08.19 14:23:05 */
export function formatShotDateTime(ms: number): string {
  return `${formatShotDate(ms)} ${formatShotTime(ms)}`;
}

/** '26 8 19 — 필름 카메라 각인풍 */
export function formatShotFilm(ms: number): string {
  const d = new Date(ms);
  return `'${pad(d.getFullYear() % 100)} ${d.getMonth() + 1} ${d.getDate()}`;
}
