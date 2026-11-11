import { DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { CaptureScreen } from '@/screens/CaptureScreen';
import { DietShareScreen } from '@/screens/DietShareScreen';
import { EditScreen } from '@/screens/EditScreen';
import { GalleryScreen } from '@/screens/GalleryScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { ProfileScreen } from '@/screens/ProfileScreen';
import { ResultScreen } from '@/screens/ResultScreen';
import { SelectScreen } from '@/screens/SelectScreen';
import { SourceScreen } from '@/screens/SourceScreen';
import { VideoCaptureScreen } from '@/screens/VideoCaptureScreen';
import { navigationRef } from '@/navigation/navigationRef';
import { linking } from '@/navigation/linking';
import type { RootStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 스토어 스크린샷 촬영용 딥링크 진입점 — 개발 빌드에서만 존재한다.
 *
 * 릴리스에서는 __DEV__ 가 false 로 상수 접힘 되어 이 require 자체가 사라지므로
 * 모듈이 번들에 포함되지 않는다. (정적 import 로 쓰면 번들에 남는다)
 */
const DemoLauncher: React.ComponentType | null = __DEV__
  ? require('@/dev/DemoLauncher').DemoLauncher
  : null;

// 배경 그라디언트는 각 화면이 직접 그리므로 네비게이터 배경은 투명.
const navTheme: Theme = {
  ...DefaultTheme,
  colors: { ...DefaultTheme.colors, background: 'transparent' },
};

export function RootNavigator() {
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      {DemoLauncher ? <DemoLauncher /> : null}
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Select" component={SelectScreen} />
        <Stack.Screen name="Source" component={SourceScreen} />
        <Stack.Screen name="Capture" component={CaptureScreen} />
        <Stack.Screen name="VideoCapture" component={VideoCaptureScreen} />
        <Stack.Screen name="Gallery" component={GalleryScreen} />
        <Stack.Screen name="Edit" component={EditScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
        <Stack.Screen name="DietShare" component={DietShareScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
