/**
 * 식단공유 스토리의 순수 로직 (날짜 키, 몸무게 파싱, 전날 대비, 회차 제안).
 * 저장소·화면과 분리해 테스트에서 그대로 검증한다.
 */

/** 하루 기록 1건. 날짜 키는 로컬 기준 YYYY-MM-DD. */
export interface DietLogEntry {
  date: string;
  weight: number;
  day?: number;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 로컬 날짜를 YYYY-MM-DD 키로. (toISOString 은 UTC 라 새벽에 하루 밀린다) */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** 스토리 머리글 날짜 · `Tuesday, Nov 10` */
export function formatStoryDate(date: Date): string {
  return `${DAYS[date.getDay()]}, ${MONTHS[date.getMonth()]} ${date.getDate()}`;
}

/** 날짜 입력 칸 표기 · `2026.11.10` */
export function formatDateInput(date: Date): string {
  return toDateKey(date).replace(/-/g, '.');
}

/**
 * 날짜 입력을 로컬 날짜로. `2026.11.10`·`2026-11-10`·`2026/11/10` 과
 * 연도를 뺀 `11.10` 을 받는다(연도는 기준 날짜의 해). 없는 날짜(2/30 등)는 null.
 */
export function parseDateInput(input: string, reference: Date): Date | null {
  const parts = input.trim().split(/[.\-/\s]+/).filter(Boolean).map(Number);
  if (parts.some((n) => !Number.isInteger(n))) return null;
  let year: number;
  let month: number;
  let day: number;
  if (parts.length === 3) [year, month, day] = parts;
  else if (parts.length === 2) [year, month, day] = [reference.getFullYear(), parts[0], parts[1]];
  else return null;
  if (year < 100) year += 2000;
  const date = new Date(year, month - 1, day);
  const valid = date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return valid ? date : null;
}

/** 입력 문자열을 몸무게로. 쉼표 소수점도 받고, 말이 안 되는 값은 null. */
export function parseWeight(input: string): number | null {
  const normalized = input.trim().replace(',', '.');
  if (!/^\d{1,3}(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return value > 0 && value < 500 ? value : null;
}

/** 소수 첫째 자리 표기 · 58 → `58.0` */
export function formatWeight(value: number): string {
  return value.toFixed(1);
}

/**
 * 전날 대비 표기 · `− 0.3 kg`, `+ 0.2 kg`, `± 0.0 kg`.
 * 부동소수 오차로 -0.30000000000000426 같은 값이 나오지 않게 0.1 단위로 먼저 반올림한다.
 */
export function formatDelta(weight: number, previous: number): string {
  const diff = Math.round((weight - previous) * 10) / 10;
  const sign = diff < 0 ? '−' : diff > 0 ? '+' : '±';
  return `${sign} ${Math.abs(diff).toFixed(1)} kg`;
}

/** 오늘보다 앞선 기록 중 가장 최근 것. 같은 날 다시 만들 때 자기 자신을 전날로 잡지 않는다. */
export function findPrevious(entries: DietLogEntry[], todayKey: string): DietLogEntry | null {
  let best: DietLogEntry | null = null;
  for (const entry of entries) {
    if (entry.date >= todayKey) continue;
    if (!best || entry.date > best.date) best = entry;
  }
  return best;
}

/**
 * 오늘 회차 제안. 오늘 기록이 이미 있으면 그 회차를 그대로,
 * 아니면 직전 기록 회차 + 1. 처음이면 1.
 */
export function suggestDay(entries: DietLogEntry[], todayKey: string): number {
  const today = entries.find((entry) => entry.date === todayKey);
  if (today?.day) return today.day;
  const previous = findPrevious(entries, todayKey);
  return previous?.day ? previous.day + 1 : 1;
}

/** 같은 날짜는 덮어쓰고 날짜순으로 정렬, 오래된 것부터 잘라 최근 limit 건만 남긴다. */
export function upsertEntry(
  entries: DietLogEntry[],
  entry: DietLogEntry,
  limit = 120,
): DietLogEntry[] {
  const next = entries.filter((item) => item.date !== entry.date);
  next.push(entry);
  next.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return next.slice(Math.max(0, next.length - limit));
}
