/**
 * 네비게이션 스택 파라미터.
 * 대부분의 상태는 SessionContext / ProfileContext로 공유하므로 params는 비워둔다.
 */
export type RootStackParamList = {
  Home: undefined;
  Profile: undefined;
  Select: undefined;
  Source: undefined;
  Capture: undefined;
  VideoCapture: undefined;
  Gallery: undefined;
  Edit: undefined;
  Result: undefined;
  /** 프레임 > 식단공유 — 몸무게·끼니 사진을 넣는 스토리 레이아웃. */
  DietShare: undefined;
};
