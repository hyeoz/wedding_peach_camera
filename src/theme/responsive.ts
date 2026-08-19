/**
 * iPad·큰 화면 대응 반응형 토큰.
 *
 * iPhone(compact)에서는 기존 레이아웃을 그대로 유지하고,
 * iPad(medium/expanded)에서는 ① 본문 최대 폭 제한 ② 그리드 열 수 증가 ③ 여백 확대를 적용한다.
 */
import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from './tokens';

/** 가로 폭 기준 브레이크포인트 (pt). iPad mini 세로 = 744pt부터 medium. */
export const breakpoints = {
  medium: 700,
  expanded: 1000,
} as const;

export type SizeClass = 'compact' | 'medium' | 'expanded';

export interface Responsive {
  width: number;
  height: number;
  sizeClass: SizeClass;
  /** compact가 아니면 태블릿 급 화면으로 간주 */
  isTablet: boolean;
  /** 본문이 가로로 과하게 늘어나지 않도록 하는 최대 폭 */
  maxContentWidth: number;
  /** 실제 본문 폭 = min(화면 폭, maxContentWidth) */
  contentWidth: number;
  /** 본문 좌우 여백 */
  gutter: number;
  /** 썸네일 그리드 열 수 */
  gridColumns: number;
  /** 모달 카드 최대 폭 */
  modalMaxWidth: number;
}

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const sizeClass: SizeClass =
      width >= breakpoints.expanded ? 'expanded' : width >= breakpoints.medium ? 'medium' : 'compact';

    const isTablet = sizeClass !== 'compact';
    const maxContentWidth = sizeClass === 'expanded' ? 760 : sizeClass === 'medium' ? 620 : width;
    const gutter = isTablet ? spacing.xxl : spacing.lg;
    const gridColumns = sizeClass === 'expanded' ? 5 : sizeClass === 'medium' ? 4 : 3;

    return {
      width,
      height,
      sizeClass,
      isTablet,
      maxContentWidth,
      contentWidth: Math.min(width, maxContentWidth),
      gutter,
      gridColumns,
      modalMaxWidth: isTablet ? 440 : width,
    };
  }, [width, height]);
}

/**
 * 화면 본문을 가운데 정렬하고 최대 폭을 제한하는 스타일.
 * 배경 그라디언트는 전체 화면을 덮은 채 콘텐츠만 중앙에 모인다.
 */
export function useContentBounds(): ViewStyle {
  const { maxContentWidth } = useResponsive();
  return { width: '100%', maxWidth: maxContentWidth, alignSelf: 'center' };
}

/**
 * 편집 화면 캔버스의 가로세로 비(width / height) 추정값.
 *
 * 캔버스(EditScreen 의 `shot`)는 flex:1 이라 고정 비율이 없고 화면 크기에 따라
 * 달라진다. 프레임 등록 미리보기를 실제와 같은 비율로 보여주려면 그 값이 필요한데,
 * 다른 화면에서는 캔버스를 직접 측정할 수 없으므로 EditScreen 이 쓰는 레이아웃
 * 상수를 그대로 적용해 되짚는다.
 *
 * 프레임 모드 기준 세로 구성:
 *   container paddingTop → TopBar → shot(marginBottom) → actions(paddingBottom)
 * 폰트 크기에 따라 TopBar 높이가 미세하게 달라질 수 있어 정확한 값이 아니라
 * 근사치다. 미리보기 용도로는 충분하다.
 */
const TOP_BAR_HEIGHT = 44;
const ACTIONS_HEIGHT = 48;

export function useCanvasAspectRatio(): number {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { maxContentWidth } = useResponsive();

  return useMemo(() => {
    const chromeV =
      spacing.sm + TOP_BAR_HEIGHT + spacing.md + ACTIONS_HEIGHT + spacing.md;
    const canvasW = Math.min(width, maxContentWidth) - spacing.lg * 2;
    const canvasH = height - insets.top - insets.bottom - chromeV;

    if (canvasW <= 0 || canvasH <= 0) return 3 / 4;
    return canvasW / canvasH;
  }, [width, height, insets.top, insets.bottom, maxContentWidth]);
}

/** 열 수와 간격에 맞춰 그리드 셀의 실제 폭(pt)을 계산한다. */
export function gridCellWidth(
  contentWidth: number,
  columns: number,
  gap: number,
  gutter: number,
): number {
  const inner = contentWidth - gutter * 2 - gap * (columns - 1);
  return Math.max(0, Math.floor(inner / columns));
}
