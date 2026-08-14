import type { OverlayMode } from '@/types';

/**
 * 네비게이션 스택 파라미터 정의.
 * 대부분의 세션 상태는 SessionContext로 공유하지만,
 * 라우팅에 꼭 필요한 값(mode)만 params로도 넘긴다.
 */
export type RootStackParamList = {
  Home: undefined;
  SelectOverlay: { mode: OverlayMode };
  Capture: undefined;
  Editor: undefined;
};
