/** 간단한 고유 id 생성기 (외부 의존성 없이). */
export function createId(prefix = 'ov'): string {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}
