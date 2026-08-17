import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';

const splashArtwork: ImageSourcePropType = require('../../assets/splash-shoujo.png');

type AnimatedSplashProps = {
  active: boolean;
  onFinish: () => void;
};

export function AnimatedSplash({ active, onFinish }: AnimatedSplashProps) {
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const artworkScale = useRef(new Animated.Value(1.035)).current;
  const sparkleProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      return undefined;
    }

    const artworkAnimation = Animated.timing(artworkScale, {
      toValue: 1,
      duration: 2200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const sparkleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleProgress, {
          toValue: 1,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(sparkleProgress, {
          toValue: 0,
          duration: 620,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
      { iterations: 2 },
    );

    const exitAnimation = Animated.sequence([
      Animated.delay(2100),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 420,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
    ]);

    artworkAnimation.start();
    sparkleAnimation.start();
    exitAnimation.start(({ finished }) => {
      if (finished) {
        onFinish();
      }
    });

    return () => {
      artworkAnimation.stop();
      sparkleAnimation.stop();
      exitAnimation.stop();
    };
  }, [active, artworkScale, onFinish, overlayOpacity, sparkleProgress]);

  const sparkleOpacity = sparkleProgress.interpolate({
    inputRange: [0, 0.45, 1],
    outputRange: [0.2, 0.72, 1],
  });
  const sparkleScale = sparkleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1.18],
  });
  const sparkleRotation = sparkleProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['-8deg', '8deg'],
  });

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={[styles.container, { opacity: overlayOpacity }]}
    >
      <Animated.Image
        resizeMode="cover"
        source={splashArtwork}
        style={[styles.artwork, { transform: [{ scale: artworkScale }] }]}
      />

      <View style={StyleSheet.absoluteFill}>
        {sparklePositions.map((position, index) => (
          <Animated.View
            key={index}
            style={[
              styles.sparkle,
              position,
              {
                opacity: sparkleOpacity,
                transform: [{ scale: sparkleScale }, { rotate: sparkleRotation }],
              },
            ]}
          >
            <Text style={styles.sparkleGlyph}>✦</Text>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
    overflow: 'hidden',
    backgroundColor: '#2B075D',
  },
  artwork: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  sparkle: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
  },
  sparkleGlyph: {
    color: '#FFF7FE',
    fontSize: 24,
    lineHeight: 26,
    textShadowColor: '#FF73D0',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  sparkleTopLeft: {
    top: '14%',
    left: '13%',
  },
  sparkleTopRight: {
    top: '23%',
    right: '12%',
  },
  sparkleMiddleLeft: {
    top: '49%',
    left: '8%',
  },
  sparkleBottomRight: {
    right: '13%',
    bottom: '16%',
  },
});

const sparklePositions = [
  styles.sparkleTopLeft,
  styles.sparkleTopRight,
  styles.sparkleMiddleLeft,
  styles.sparkleBottomRight,
];
