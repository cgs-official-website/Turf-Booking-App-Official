import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Image, Animated, Dimensions, Easing } from 'react-native';

const { width, height } = Dimensions.get('window');

const FRAMES = [
  require('../assets/splash-1.png'),
  require('../assets/splash-2.png'),
  require('../assets/splash-3.png'),
  require('../assets/splash-4.png'),
  require('../assets/splash-5.png'),
];

const FRAME_DURATION = 320;
const FADE_DURATION = 180;
const HOLD_ON_LAST_FRAME = 700;

// 8 floating particles with randomized starting X and drift speeds
const PARTICLES = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  x: width * 0.15 + (i * (width * 0.7)) / 7,
  size: 4 + (i % 3) * 2,
  driftDelay: i * 280,
  duration: 4000 + (i % 4) * 800,
}));

const SplashScreen = ({ onFinish }) => {
  const [frameIndex, setFrameIndex] = useState(0);

  // Logo badge physics
  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoRotate = useRef(new Animated.Value(-4)).current;
  const logoOpacity = useRef(new Animated.Value(1)).current;

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
  const wordTurfOpacity = useRef(new Animated.Value(0)).current;
  const wordTurfTranslateY = useRef(new Animated.Value(16)).current;
  const wordVendorOpacity = useRef(new Animated.Value(0)).current;
  const wordVendorTranslateY = useRef(new Animated.Value(16)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const taglineTranslateY = useRef(new Animated.Value(10)).current;

  // Progress Bar & Shimmer
  const progressAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Coordinated Exit
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const screenTranslateY = useRef(new Animated.Value(0)).current;

  // Particle drift animations
  const particleAnims = useRef(PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    // 1. Physics Spring Entrance on Logo
    Animated.parallel([
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

    const r1 = createRingLoop(ring1Scale, ring1Opacity, 0.08, 0.35, 0);
    const r2 = createRingLoop(ring2Scale, ring2Opacity, 0.05, 0.25, 150);
    const r3 = createRingLoop(ring3Scale, ring3Opacity, 0.02, 0.18, 300);
    r1.start();
    r2.start();
    r3.start();

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
        Animated.timing(wordTurfOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(wordTurfTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
      Animated.delay(60),
      Animated.parallel([
        Animated.timing(wordVendorOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(wordVendorTranslateY, { toValue: 0, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
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
      duration: (FRAMES.length * FRAME_DURATION) + HOLD_ON_LAST_FRAME - 150,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
      useNativeDriver: false,
    }).start();

    // 7. Sequential Frame Transition + Hero Moment on Frame 5
    let holdTimer;
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      if (i >= FRAMES.length) {
        clearInterval(timer);

        // Frame 5 "Hero Moment": scale pop + emerald glow flash
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

        // Hold and trigger coordinated exit
        holdTimer = setTimeout(() => {
          triggerExitTransition();
        }, HOLD_ON_LAST_FRAME);
        return;
      }

      // Smooth Frame Crossfade
      Animated.timing(logoOpacity, {
        toValue: 0.25,
        duration: FADE_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        setFrameIndex(i);
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: FADE_DURATION / 2,
          useNativeDriver: true,
        }).start();
      });
    }, FRAME_DURATION);

    const triggerExitTransition = () => {
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
        Animated.timing(logoScale, {
          toValue: 1.05,
          duration: 260,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onFinish) onFinish();
      });
    };

    // 8. Hard fallback safety timer (3.0 seconds max)
    const fallbackTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, 3000);

    return () => {
      clearInterval(timer);
      clearTimeout(holdTimer);
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
        <Image source={FRAMES[frameIndex]} style={styles.logoImage} resizeMode="contain" />
      </Animated.View>

      {/* Layer 4: Staggered Typography Reveal */}
      <View style={styles.textContainer}>
        <View style={styles.titleRow}>
          <Animated.Text
            style={[
              styles.titleTurf,
              {
                opacity: wordTurfOpacity,
                transform: [{ translateY: wordTurfTranslateY }],
              },
            ]}
          >
            TURF
          </Animated.Text>
          <Animated.Text
            style={[
              styles.titleVendor,
              {
                opacity: wordVendorOpacity,
                transform: [{ translateY: wordVendorTranslateY }],
              },
            ]}
          >
            VENDOR
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
          Partner Portal & Facility Manager
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
        <Text style={styles.versionText}>POWERING SPORTS ARENAS</Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Ambient Concentric Rings
  ambientRing: {
    position: 'absolute',
    borderRadius: 200,
    backgroundColor: 'rgba(0, 197, 102, 0.18)',
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

  // Hero Glow
  heroGlowCircle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(0, 197, 102, 0.45)',
  },

  // Particle Atmosphere
  particle: {
    position: 'absolute',
    backgroundColor: '#00C566',
  },

  // Logo Card
  logoCard: {
    width: 215,
    height: 215,
    borderRadius: 108,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(0, 197, 102, 0.3)',
    shadowColor: '#00C566',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 8,
  },
  logoImage: {
    width: 158,
    height: 158,
  },

  // Typography
  textContainer: {
    alignItems: 'center',
    marginTop: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleTurf: {
    fontSize: 23,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 2.5,
  },
  titleVendor: {
    fontSize: 23,
    fontWeight: '900',
    color: '#00C566',
    letterSpacing: 2.5,
  },
  tagline: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    letterSpacing: 0.5,
    marginTop: 6,
  },

  // Progress Bar
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
    backgroundColor: '#00C566',
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

export default SplashScreen;