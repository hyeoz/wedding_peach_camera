/**
 * 식단공유 몸무게 기록 영속화.
 * 다음 날 "전날 대비"와 회차를 자동으로 채우려고 날짜별 몸무게만 남긴다. 사진은 저장하지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { upsertEntry, type DietLogEntry } from '@/utils/dietLog';

const KEY = '@wpc/diet-log/v1';

export async function loadDietLog(): Promise<DietLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is DietLogEntry =>
        !!item &&
        typeof item.date === 'string' &&
        typeof item.weight === 'number' &&
        (item.day === undefined || typeof item.day === 'number'),
    );
  } catch {
    return [];
  }
}

export async function saveDietLogEntry(entry: DietLogEntry): Promise<DietLogEntry[]> {
  const next = upsertEntry(await loadDietLog(), entry);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // 기록 저장 실패는 이미지 완성을 막지 않는다. 다음 날 전날 값만 직접 넣으면 된다.
  }
  return next;
}
