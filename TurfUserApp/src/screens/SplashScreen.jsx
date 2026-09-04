import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, Animated, Dimensions, Easing, StatusBar,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { bootstrapAuth, setSplashDone } from '../redux/authSlice';
import { COLORS } from '../utils/theme';

const { width, height } = Dimensions.get('window');

const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: width * 0.15 + (i * (width * 0.7)) / 7,
  size: 4 + (i % 3) * 2,
  driftDelay: i * 280,
  duration: 4000 + (i % 4) * 800,
}));

export default function SplashScreen() {
  const dispatch = useDispatch();

  // Logo badge physics
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoRotate = useRef(new Animated.Value(-4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // Staggered Concentric Ambient Rings
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring1Opacity = useRef(new Animated.Value(0.35)).current;
  const ring2Scale = useRef(new Animated.Value(0.95)).current;
  const ring2Opacity = useRef(new Animated.Value(0.25)).current;
  const ring3Scale = useRef(new Animated.Value(0.9)).current;
  const ring3Opacity = useRef(new Animated.Value(0.15)).current;

  // Hero Glow Moment
  const heroGlowOpacity = useRef(new Animated.Value(0)).current;

  // Typography Stagger
  const word1Opacity = useRef(new Animated.Value(0)).current;
  const word1TranslateY = useRef(new Animated.Value(16)).current;
  const word2Opacity = useRef(new Animated.Value(0)).current;
  const word2TranslateY = useRef(new Animated.Value(16)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  // Progress Bar & Shimmer
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Coordinated Exit
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;

  // Particles
  const particleAnims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    dispatch(bootstrapAuth());

    // 1. Physics Spring Entrance on Logo
    Animated.parallel([
      Animated.timing(logoOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 55,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(logoRotate, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Staggered 3-Ring Ambient Pulse Loops
    const createRingLoop = (scaleAnim, opacityAnim, minO, maxO, delay = 0) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.28, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: minO, duration: 1300, useNativeDriver: true }),
          ]),
          Animated.parallel([
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: maxO, duration: 1300, useNativeDriver: true }),
          ]),
        ])
      );
    };

    createRingLoop(ring1Scale, ring1Opacity, 0.08, 0.35, 0).start();
    createRingLoop(ring2Scale, ring2Opacity, 0.05, 0.25, 150).start();
    createRingLoop(ring3Scale, ring3Opacity, 0.02, 0.18, 300).start();

    // 3. Floating Particles Loop
    PARTICLES.forEach((p, idx) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.driftDelay),
          Animated.timing(particleAnims[idx], {
            toValue: 1,
            duration: p.duration,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(particleAnims[idx], {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    });

    // 4. Shimmer Effect on Progress Bar
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 5. Staggered Word Reveal
    Animated.sequence([
      Animated.delay(200),
      Animated.parallel([
        Animated.timing(word1Opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(word1TranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(60),
      Animated.parallel([
        Animated.timing(word2Opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(word2TranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(taglineTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();

    // 6. Eased Progress Bar Fill
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2100,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    // 7. Hero Moment Glow Pulse
    const heroTimer = setTimeout(() => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(logoScale, { toValue: 1.08, duration: 180, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
          Animated.timing(logoScale, { toValue: 1.0, duration: 240, easing: Easing.bezier(0.22, 1, 0.36, 1), useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(heroGlowOpacity, { toValue: 0.5, duration: 200, useNativeDriver: true }),
          Animated.timing(heroGlowOpacity, { toValue: 0, duration: 280, useNativeDriver: true }),
        ]),
      ]).start();
    }, 1500);

    // 8. Coordinated Exit
    const exitTimer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(screenOpacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(screenTranslateY, {
          toValue: -20,
          duration: 260,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        dispatch(setSplashDone());
      });
    }, 2400);

    // Hard fallback safety
    const fallbackTimer = setTimeout(() => {
      dispatch(setSplashDone());
    }, 3000);

    return () => {
      clearTimeout(heroTimer);
      clearTimeout(exitTimer);
      clearTimeout(fallbackTimer);
    };
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width * 0.6, width * 0.6],
  });

  const rotationInterpolated = logoRotate.interpolate({
    inputRange: [-4, 0],
    outputRange: ['-4deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: screenOpacity,
          transform: [{ translateY: screenTranslateY }],
        },
      ]}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Layer 1: Concentric Ambient Rings */}
      <Animated.View
        style={[
          styles.ambientRing,
          styles.ring3,
          { transform: [{ scale: ring3Scale }], opacity: ring3Opacity },
        ]}
      />
      <Animated.View
        style={[
          styles.ambientRing,
          styles.ring2,
          { transform: [{ scale: ring2Scale }], opacity: ring2Opacity },
        ]}
      />
      <Animated.View
        style={[
          styles.ambientRing,
          styles.ring1,
          { transform: [{ scale: ring1Scale }], opacity: ring1Opacity },
        ]}
      />

      {/* Layer 2: Floating Ambient Particles */}
      {PARTICLES.map((p, idx) => {
        const translateY = particleAnims[idx].interpolate({
          inputRange: [0, 1],
          outputRange: [height * 0.65, height * 0.25],
        });
        const opacity = particleAnims[idx].interpolate({
          inputRange: [0, 0.3, 0.7, 1],
          outputRange: [0, 0.15, 0.12, 0],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                left: p.x,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}

      {/* Hero Glow Flash Behind Logo */}
      <Animated.View
        style={[
          styles.heroGlowCircle,
          {
            opacity: heroGlowOpacity,
          },
        ]}
      />

      {/* Layer 3: Logo Card with Physics Spring & Rotation */}
      <Animated.View
        style={[
          styles.logoCard,
          {
            transform: [
              { scale: logoScale },
              { rotate: rotationInterpolated },
            ],
            opacity: logoOpacity,
          },
        ]}
      >
        <Image source={require('../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
      </Animated.View>

      {/* Layer 4: Staggered Typography Reveal */}
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Animated.Text
            style={[
              styles.title1,
              {
                opacity: word1Opacity,
                transform: [{ translateY: word1TranslateY }],
              },
            ]}
          >
            NAMMA OORU
          </Animated.Text>
          <Animated.Text
            style={[
              styles.title2,
              {
                opacity: word2Opacity,
                transform: [{ translateY: word2TranslateY }],
              },
            ]}
          >
            TURF
          </Animated.Text>
        </View>

        <Animated.Text
          style={[
            styles.tagline,
            {
              opacity: taglineOpacity,
              transform: [{ translateY: taglineTranslateY }],
            },
          ]}
        >
          BOOK • PLAY • COMPETE
        </Animated.Text>
      </View>

      {/* Layer 5: Shimmering Micro-Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBarTrack}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]}>
            <Animated.View
              style={[
                styles.shimmerSweep,
                { transform: [{ translateX: shimmerTranslate }] },
              ]}
            />
          </Animated.View>
        </View>
        <Text style={styles.versionText}>FIND ARENAS & JOIN MATCHES</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  ambientRing: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(12, 176, 83, 0.18)',
  },
  ring1: {
    width: 260,
    height: 260,
  },
  ring2: {
    width: 320,
    height: 320,
  },
  ring3: {
    width: 380,
    height: 380,
  },

  heroGlowCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(12, 176, 83, 0.45)',
  },

  particle: {
    position: 'absolute',
    backgroundColor: '#0CB053',
  },

  logoCard: {
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(12, 176, 83, 0.3)',
    shadowColor: '#0CB053',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImage: {
    width: 150,
    height: 150,
  },

  textContainer: {
    alignItems: 'center',
    marginTop: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title1: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2,
  },
  title2: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0CB053',
    letterSpacing: 2,
  },
  tagline: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 2,
    marginTop: 6,
  },

  progressContainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: width * 0.62,
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#0CB053',
    borderRadius: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  shimmerSweep: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  versionText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.5,
  },
});