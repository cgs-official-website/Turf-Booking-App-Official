import React, { useEffect, useRef } from 'react';
import {
  View, StyleSheet, Animated, Dimensions, Easing, StatusBar,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { bootstrapAuth, setSplashDone } from '../redux/authSlice';
import { COLORS } from '../utils/theme';

const { height } = Dimensions.get('window');

// Total animation time: 800+600+700+800+600+400+600 = 4500ms
const SPLASH_MIN_DURATION = 4500;

export default function SplashScreen() {
  const dispatch = useDispatch();

  // ── Animated values ──────────────────────────────────────────────────────
  const greenOpacity = useRef(new Animated.Value(1)).current;
  const logoY        = useRef(new Animated.Value(-300)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const logoRotate   = useRef(new Animated.Value(0)).current;
  const fullLogoOp   = useRef(new Animated.Value(0)).current;
  const taglineOp    = useRef(new Animated.Value(0)).current;

  // ── Bootstrap: fire immediately, but don't let navigator switch away
  // until the splash animation has actually finished on screen ────────────
  useEffect(() => {
    dispatch(bootstrapAuth());

    const timer = setTimeout(() => {
      dispatch(setSplashDone());
    }, SPLASH_MIN_DURATION);

    return () => clearTimeout(timer);
  }, []);

  // ── Animation sequence ───────────────────────────────────────────────────
  useEffect(() => {
    Animated.sequence([
      // Step 1: Green screen hold (800ms)
      Animated.delay(800),

      // Step 2: Green fade out (600ms)
      Animated.timing(greenOpacity, {
        toValue: 0, duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      // Step 3: Logo drop + fade in (700ms)
      Animated.parallel([
        Animated.timing(logoY, {
          toValue: 0, duration: 700,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1, duration: 500,
          useNativeDriver: true,
        }),
      ]),

      // Step 4: 360 spin (800ms)
      Animated.timing(logoRotate, {
        toValue: 1, duration: 800,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),

      // Step 5: Full logo fade in (600ms)
      Animated.timing(fullLogoOp, {
        toValue: 1, duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),

      // Step 6: Tagline fade in (400ms)
      Animated.timing(taglineOp, {
        toValue: 1, duration: 400,
        useNativeDriver: true,
      }),

      // Step 7: Hold (600ms)
      Animated.delay(600),

    ]).start();
  }, []);

  const spin = logoRotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const iconOnlyOp = Animated.multiply(
    logoOpacity,
    fullLogoOp.interpolate({
      inputRange:  [0, 0.3, 1],
      outputRange: [1, 1,   0],
    })
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />

      {/* White bg */}
      <View style={[styles.fill, { backgroundColor: '#fff' }]} />

      {/* Green overlay */}
      <Animated.View style={[styles.fill, { backgroundColor: COLORS.primary, opacity: greenOpacity }]} />

      {/* Logo icon - drops + spins */}
      <Animated.Image
        source={require('../assets/logosm.png')}
        style={[
          styles.logoIcon,
          {
            opacity: iconOnlyOp,
            transform: [
              { translateY: logoY },
              { perspective: 1000 },
              { rotateY: spin },
            ],
          },
        ]}
        resizeMode="contain"
      />

      {/* Full logo */}
      <Animated.Image
        source={require('../assets/logo_full.png')}
        style={[styles.logoFull, { opacity: fullLogoOp }]}
        resizeMode="contain"
      />

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOp }]}>
        — PLAY LOCAL, PLAY MORE —
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  fill:      { ...StyleSheet.absoluteFillObject },
  logoIcon:  { position: 'absolute', width: 130, height: 130 },
  logoFull:  { width: 280, height: 170 },
  tagline:   {
    position: 'absolute', bottom: height * 0.15,
    fontSize: 11, fontWeight: '600',
    color: COLORS.primary, letterSpacing: 2,
  },
});