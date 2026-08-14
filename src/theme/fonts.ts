/**
 * 폰트 패밀리 상수.
 * UI 텍스트가 대부분 한글이라 귀여운 한글 폰트를 사용한다.
 * - 제목/버튼: Jua (둥글고 귀여운 한글)
 * - 본문/숫자: Poppins (깔끔한 산세리프, 한글은 시스템 폰트로 폴백)
 * - 다이어리 텍스트 카드: Gaegu (손글씨 느낌)
 *
 * 실제 로드는 App.tsx의 useFonts에서 처리한다.
 */
export const fonts = {
  /** 제목/버튼 — Jua */
  title: 'Jua_400Regular',
  titleMedium: 'Jua_400Regular',
  titleExtra: 'Jua_400Regular',

  /** 본문 — Poppins */
  body: 'Poppins_400Regular',
  bodyMedium: 'Poppins_500Medium',
  bodySemiBold: 'Poppins_600SemiBold',
  bodyBold: 'Poppins_700Bold',

  /** 다이어리 카드 — Gaegu */
  cute: 'Gaegu_700Bold',
} as const;
