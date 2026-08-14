/** 오늘 날짜를 "2026.08.14" 형태로 반환. */
export function todayLabel(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}.${m}.${day}`;
}
