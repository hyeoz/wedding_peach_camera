// 사용하는 굵기만 굵기별 서브패스로 import 해 번들 용량을 줄인다.
// (@expo-google-fonts v0.4부터 `<패키지>/<굵기>` 경로로 변경됨)
import { Gaegu_700Bold } from '@expo-google-fonts/gaegu/700Bold';
import { Jua_400Regular } from '@expo-google-fonts/jua/400Regular';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useRef, useState } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AnimatedSplash } from '@/components/AnimatedSplash';
import { ProfileProvider } from '@/context/ProfileContext';
import { SessionProvider } from '@/context/SessionContext';
import { UserLibraryProvider } from '@/context/UserLibraryContext';
import { RootNavigator } from '@/navigation/RootNavigator';
import { ThemeProvider } from '@/theme/ThemeContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  const [showAnimatedSplash, setShowAnimatedSplash] = useState(true);
  const [splashAnimationActive, setSplashAnimationActive] = useState(false);
  const nativeSplashDismissed = useRef(false);
  const [fontsLoaded, fontError] = useFonts({
    Jua_400Regular,
    Gaegu_700Bold,
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const onLayoutRoot = useCallback(() => {
    // 폰트가 준비되면 스플래시를 숨긴다. (에러 시에도 앱은 시스템 폰트로 동작)
    if ((fontsLoaded || fontError) && !nativeSplashDismissed.current) {
      nativeSplashDismissed.current = true;
      SplashScreen.hideAsync()
        .catch(() => {})
        .finally(() => setSplashAnimationActive(true));
    }
  }, [fontsLoaded, fontError]);

  const finishAnimatedSplash = useCallback(() => {
    setShowAnimatedSplash(false);
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRoot}>
      <SafeAreaProvider>
        <ProfileProvider>
          <ThemeProvider>
            <UserLibraryProvider>
              <SessionProvider>
                <StatusBar style={showAnimatedSplash ? 'light' : 'dark'} />
                <View style={{ flex: 1 }}>
                  <RootNavigator />
                  {showAnimatedSplash ? (
                    <AnimatedSplash
                      active={splashAnimationActive}
                      onFinish={finishAnimatedSplash}
                    />
                  ) : null}
                </View>
              </SessionProvider>
            </UserLibraryProvider>
          </ThemeProvider>
        </ProfileProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
