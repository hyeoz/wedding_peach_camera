import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/**
 * 단축어의 'URL 열기'로 화면에 바로 진입한다.
 * - `wepicam://video` 동영상 촬영 (녹화는 사용자 버튼으로 시작)
 * - `wepicam://diet` 식단공유 (`?format=feed` 면 게시글 4:5 로 연다)
 */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['wepicam://'],
  config: {
    initialRouteName: 'Home',
    screens: {
      Home: '',
      VideoCapture: 'video',
      DietShare: 'diet',
    },
  },
};
