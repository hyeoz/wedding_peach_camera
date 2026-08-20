/**
 * 비율을 유지한 채 크기를 맞추는 계산들.
 *
 * 편집 캔버스는 사진 비율을 그대로 따르고(fitInside), 프레임은 그 캔버스를
 * 빈틈없이 덮는 크기에서 시작한다(coverFraction). 결과 화면 미리보기도 같은
 * fitInside 를 쓴다.
 */

export interface Size {
  width: number;
  height: number;
}

/**
 * `area` 안에 `aspectRatio`(width/height) 비율을 유지한 채 최대로 들어가는 크기.
 * 남는 쪽은 여백이 된다. 계산할 수 없으면 null.
 */
export function fitInside(area: Size, aspectRatio: number | null | undefined): Size | null {
  if (!aspectRatio || aspectRatio <= 0 || area.width <= 0 || area.height <= 0) return null;

  if (area.width / area.height > aspectRatio) {
    return { width: area.height * aspectRatio, height: area.height };
  }

  return { width: area.width, height: area.width / aspectRatio };
}

/**
 * 캔버스를 빈틈없이 덮는 항목 박스의 크기를, 캔버스 폭/높이 대비 비율로 돌려준다.
 *
 * 두 비율만으로 정해지므로 캔버스의 실제 pt 크기와 무관하다. 덕분에 화면 회전이나
 * 원본 해상도 합성처럼 캔버스 크기가 달라져도 같은 값을 그대로 쓸 수 있다.
 */
export function coverFraction(canvasAspect: number, itemAspect: number): Size {
  if (!canvasAspect || !itemAspect || canvasAspect <= 0 || itemAspect <= 0) {
    return { width: 1, height: 1 };
  }

  return canvasAspect > itemAspect
    ? { width: 1, height: canvasAspect / itemAspect }
    : { width: itemAspect / canvasAspect, height: 1 };
}
