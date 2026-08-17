/**
 * iPad·큰 화면 대응 반응형 토큰.
 *
 * iPhone(compact)에서는 기존 레이아웃을 그대로 유지하고,
 * iPad(medium/expanded)에서는 ① 본문 최대 폭 제한 ② 그리드 열 수 증가 ③ 여백 확대를 적용한다.
 */
import { useMemo } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';

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
