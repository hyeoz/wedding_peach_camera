import type { LinkingOptions } from '@react-navigation/native';

import type { RootStackParamList } from './types';

/** 단축어의 'URL 열기'로 촬영 화면에 진입한다. 녹화는 사용자 버튼으로 시작한다. */
export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['wepicam://'],
  config: {
    initialRouteName: 'Home',
    screens: {
      Home: '',
      VideoCapture: 'video',
    },
  },
};
