import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DownloadIcon, HomeIcon, ShareIcon } from '@/components/Icons';
import { GradientBackground } from '@/components/GradientBackground';
import { useSession } from '@/context/SessionContext';
import type { RootStackParamList } from '@/navigation/types';
import {
  fonts,
  radius,
  spacing,
  useContentBounds,
  useTheme,
  useThemedStyles,
  type ThemeColors,
} from '@/theme';
import { fitInside, type Size } from '@/utils/layout';
import { saveToGallery, shareImage } from '@/utils/media';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export function ResultScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useThemedStyles(makeStyles);
  const bounds = useContentBounds();
  const { resultUri, reset } = useSession();
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<number | null>(null);
  const [previewArea, setPreviewArea] = useState<Size>({ width: 0, height: 0 });
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastOffset = useRef(new Animated.Value(12)).current;
  const toastAnimation = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (!resultUri) {
      setImageAspectRatio(null);
      return;
    }

    Image.getSize(
      resultUri,
      (width, height) => {
        if (width > 0 && height > 0) setImageAspectRatio(width / height);
      },
      () => setImageAspectRatio(1),
    );
  }, [resultUri]);

  useEffect(
    () => () => {
      toastAnimation.current?.stop();
    },
    [],
  );

  const previewSize = fitInside(previewArea, imageAspectRatio);

  const showToast = (text: string) => {
    toastAnimation.current?.stop();
    setToast(text);
    toastOpacity.setValue(0);
    toastOffset.setValue(12);

    const animation = Animated.sequence([
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(toastOffset, {
          toValue: 0,
          duration: 180,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.delay(1500),
      Animated.parallel([
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(toastOffset, {
          toValue: -6,
          duration: 220,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]);

    toastAnimation.current = animation;
    animation.start(({ finished }) => {
      if (finished) setToast('');
    });
  };

  const handleSave = async () => {
    if (!resultUri) return;
    try {
      setSaving(true);
      await saveToGallery(resultUri);
      showToast('저장되었습니다');
    } catch (e) {
      showToast(e instanceof Error ? e.message : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  /**
   * 한 번의 꾸미기 흐름이 여기서 끝나므로, 홈으로 돌아갈 때 편집 세션을 비운다.
   * 그러지 않으면 사진·배치한 스티커·프레임 선택이 다음 촬영까지 따라온다.
   */
  const handleGoHome = () => {
    reset();
    navigation.popToTop();
  };

  const handleShare = async () => {
    if (!resultUri) return;
    try {
      await shareImage(resultUri);
    } catch (e) {
      showToast(e instanceof Error ? e.message : '공유에 실패했습니다.');
    }
  };

  return (
    <GradientBackground>
      <SafeAreaView style={[styles.container, bounds]} edges={['top', 'bottom']}>
        <Text style={styles.title}>완성됐어요!</Text>

        <View
          style={styles.previewArea}
          onLayout={({ nativeEvent }) => setPreviewArea(nativeEvent.layout)}
        >
          {resultUri && previewSize ? (
            <View style={[styles.preview, previewSize]}>
              <Image source={{ uri: resultUri }} style={styles.image} resizeMode="contain" />
            </View>
          ) : null}
        </View>

        <View style={styles.row}>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [styles.btn, styles.btnPrimary, pressed && styles.pressed]}
          >
            <DownloadIcon />
            <Text style={styles.btnPrimaryLabel}>저장</Text>
          </Pressable>
          <Pressable
            onPress={handleShare}
            style={({ pressed }) => [styles.btn, styles.btnOutline, pressed && styles.pressed]}
          >
            <ShareIcon color={colors.text} />
            <Text style={styles.btnOutlineLabel}>공유</Text>
          </Pressable>
        </View>

        {/* 결과 화면은 흐름의 끝이므로 스택을 쌓지 않고 첫 화면(Home)으로 되돌린다. */}
        <Pressable
          style={styles.home}
          accessibilityRole="button"
          accessibilityLabel="메인 화면으로 돌아가기"
          onPress={handleGoHome}
        >
          <HomeIcon color={colors.primaryDeep} />
          <Text style={styles.homeLabel}>메인 화면으로</Text>
        </Pressable>

        {toast ? (
          <Animated.View
            accessibilityLiveRegion="polite"
            pointerEvents="none"
            style={[
              styles.toast,
              { opacity: toastOpacity, transform: [{ translateY: toastOffset }] },
            ]}
          >
            <Text style={styles.toastText}>{toast}</Text>
          </Animated.View>
        ) : null}
      </SafeAreaView>
    </GradientBackground>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: fonts.title,
    fontSize: 18,
    color: colors.text,
    textAlign: 'center',
    paddingBottom: spacing.md,
  },
  previewArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  preview: {
    borderRadius: radius.canvas,
    overflow: 'hidden',
    backgroundColor: colors.canvas,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.md,
  },
  btn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  btnPrimary: {
    backgroundColor: colors.primary,
  },
  btnPrimaryLabel: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.white,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  btnOutlineLabel: {
    fontFamily: fonts.title,
    fontSize: 15,
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
  home: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  homeLabel: {
    fontFamily: fonts.title,
    fontSize: 14,
    color: colors.primaryDeep,
  },
  toast: {
    position: 'absolute',
    left: spacing.xl,
    right: spacing.xl,
    bottom: 122,
    alignItems: 'center',
    zIndex: 20,
  },
  toastText: {
    maxWidth: '100%',
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(55, 28, 83, 0.94)',
    color: colors.white,
    fontFamily: fonts.title,
    fontSize: 14,
    textAlign: 'center',
    shadowColor: '#2B123D',
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
});
