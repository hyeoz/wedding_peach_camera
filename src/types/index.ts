/**
 * 앱 전역 핵심 타입.
 */
import type { TakenAtSource } from '@/utils/exif';

export type { OverlayMode } from '@/data/library';

/** 촬영/선택된 사진. */
export interface Photo {
  uri: string;
  width?: number;
  height?: number;
  /** 촬영 일시(epoch ms). EXIF → 앨범 등록 시각 → 현재 시각 순으로 확정된다. */
  takenAt?: number;
  /** takenAt 을 어디서 얻었는지. 'exif' 가 아니면 근사치다. */
  takenAtSource?: TakenAtSource;
}

/**
 * 편집 캔버스에 배치된 항목 (이미지 스티커 또는 텍스트 카드).
 */
export interface PlacedItem {
  /** 인스턴스 고유 id (p1, p2, ...). */
  id: string;
  /** 'sticker' = 이미지 스티커, 'text' = 텍스트 카드. */
  kind: 'sticker' | 'text';
  /** 스티커 라이브러리 id 또는 텍스트 템플릿 id. */
  refId: string;
  /** 캔버스 좌상단 기준 위치(px). */
  x: number;
  y: number;
  /** 배율 (0.5 ~ 2.5). */
  scale: number;
  /** 회전(도). */
  rotation: number;
  /** 텍스트 카드 전용 — choice 줄들의 선택값 (key -> 옵션). */
  choices?: Record<string, string>;
  /** 텍스트 카드 전용 — note 줄들의 입력값 (key -> 텍스트). */
  notes?: Record<string, string>;
}
