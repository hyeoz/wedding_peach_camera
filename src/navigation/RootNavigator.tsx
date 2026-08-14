import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { colors } from '@/theme';

import { CaptureScreen } from '@/screens/CaptureScreen';
import { EditorScreen } from '@/screens/EditorScreen';
import { HomeScreen } from '@/screens/HomeScreen';
import { SelectOverlayScreen } from '@/screens/SelectOverlayScreen';
import type { RootStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: 'Wedding Peach Camera' }}
        />
        <Stack.Screen
          name="SelectOverlay"
          component={SelectOverlayScreen}
          options={{ title: '프레임 / 스티커 선택' }}
        />
        <Stack.Screen name="Capture" component={CaptureScreen} options={{ title: '촬영' }} />
        <Stack.Screen name="Editor" component={EditorScreen} options={{ title: '편집 & 저장' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
