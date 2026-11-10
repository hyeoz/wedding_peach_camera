/**
 * 네비게이션 컨테이너 참조.
 *
 * 화면 트리 밖(딥링크 처리 등)에서 화면을 옮겨야 할 때 쓴다.
 * 화면 안에서는 평소대로 props 의 navigation 을 쓰면 된다.
 */
import { createNavigationContainerRef } from '@react-navigation/native';

import type { RootStackParamList } from '@/navigation/types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();
