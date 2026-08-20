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
 * 편집 캔버스에 배치된 항목 (프레임, 이미지 스티커, 텍스트 카드).
 *
 * 좌표와 배율은 캔버스 크기에 대한 상대값이다. 캔버스는 기기·화면 회전에 따라
 * pt 크기가 달라지고, 저장할 때는 원본 해상도 캔버스에 다시 그리므로,
 * 절대 px 로 두면 그 순간마다 배치가 어긋난다.
 */
export interface PlacedItem {
  /** 인스턴스 고유 id (p1, p2, ...). */
  id: string;
  /** 'frame' = 프레임, 'sticker' = 이미지 스티커, 'text' = 텍스트 카드. */
  kind: 'frame' | 'sticker' | 'text';
  /** 프레임/스티커 라이브러리 id 또는 텍스트 템플릿 id. */
  refId: string;
  /** 캔버스 좌상단 기준 위치 — 캔버스 폭/높이 대비 비율(0..1, 캔버스 밖이면 범위 밖). */
  x: number;
  y: number;
  /** 기본 크기 대비 배율. 기본 크기 자체가 캔버스 폭에 비례한다. */
  scale: number;
  /** 회전(도). */
  rotation: number;
  /** 텍스트 카드 전용 — choice 줄들의 선택값 (key -> 옵션). */
  choices?: Record<string, string>;
  /** 텍스트 카드 전용 — note 줄들의 입력값 (key -> 텍스트). */
  notes?: Record<string, string>;
}
