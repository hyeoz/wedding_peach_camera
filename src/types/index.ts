/**
 * 앱 전역에서 사용하는 핵심 타입 정의.
 */

/** 오버레이 모드: 프레임(사진이 중앙에 들어감) 또는 스티커(사진 위에 붙임). */
export type OverlayMode = 'frame' | 'sticker';

/** 프레임/스티커로 사용할 이미지 자원. */
export interface OverlayAsset {
  /** 고유 id (즐겨찾기 저장 시 사용). */
  id: string;
  /** 이미지 uri (로컬 file:// 또는 asset:// 등). */
  uri: string;
  /** 프레임인지 스티커인지. */
  mode: OverlayMode;
  /** 표시용 이름 (선택). */
  name?: string;
  /** 원본 이미지 비율(가로/세로). 프레임 캔버스 비율 계산에 사용. */
  aspectRatio?: number;
}

/** 촬영 or 불러온 사진. */
export interface Photo {
  uri: string;
  width?: number;
  height?: number;
}

/** 즐겨찾기에 저장되는 항목. */
export interface FavoriteOverlay extends OverlayAsset {
  /** 저장 시각 (정렬용). */
  createdAt: number;
}
