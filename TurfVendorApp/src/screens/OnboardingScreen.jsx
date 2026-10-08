import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Dimensions, StatusBar, Animated, PanResponder,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    image: require('../assets/onboard_illust1.png'),
    title: 'Manage Your Turf Business',
    subtitle: 'Track bookings, manage your slots, monitor performance and grow your business — all in one place.',
    buttonText: 'Next',
  },
  {
    id: '2',
    image: require('../assets/onboard_illust2.png'),
    title: 'Update Slots Easily',
    subtitle: 'Easily update available slots, pricing, and court schedules in real-time.',
    buttonText: 'Next',
  },
  {
    id: '3',
    image: require('../assets/onboard_illust3.png'),
    title: 'Complete Your Profile',
    subtitle: 'Verify your details, get approved and start receiving bookings from players.',
    buttonText: 'Get Started',
  },
];

export default function OnboardingScreen({ navigation }) {
  const [index, setIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToSlide = (newIndex, direction = 1) => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 130,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20 * direction,
        duration: 130,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndex(newIndex);
      slideAnim.setValue(20 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleNext = () => {
    if (index < SLIDES.length - 1) {
      animateToSlide(index + 1, 1);
    } else {
      navigation.navigate('Login');
    }
  };

  const handlePrev = () => {
    if (index > 0) {
      animateToSlide(index - 1, -1);
    }
  };

  const handleSkip = () => {
    navigation.navigate('Login');
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 25,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -40) {
          handleNext();
        } else if (gestureState.dx > 40) {
          handlePrev();
        }
      },
    })
  ).current;

  const currentSlide = SLIDES[index];

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <View style={styles.logoRow}>
          <View style={styles.logoCircle}>
            <Image
              source={require('../assets/logo.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View>
            <Text style={styles.brandTitle}>NAMMA OORU TURF</Text>
            <Text style={styles.brandSubtitle}>VENDOR</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.skipBtn} onPress={handleSkip} activeOpacity={0.7}>
          <Text style={styles.skipBtnText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Main Slide Area with Swipe Support */}
      <View style={styles.mainContainer} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.animatedSlide,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          {/* Illustration */}
          <View style={styles.illustrationContainer}>
            <Image
              source={currentSlide.image}
              style={styles.illustration}
              resizeMode="contain"
            />
          </View>

          {/* Text Content Below Illustration */}
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentSlide.title}</Text>
            <Text style={styles.subtitle}>{currentSlide.subtitle}</Text>
          </View>
        </Animated.View>

        {/* Slide Indicator Line / Dots (#0F766E) */}
        <View style={styles.dotsContainer}>
          {SLIDES.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => animateToSlide(i, i > index ? 1 : -1)}>
              <View
                style={[
                  styles.dot,
                  i === index ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Bottom CTA Button (#0F766E, without sparkle icon) */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.ctaButtonText}>
            {currentSlide.buttonText}{index < SLIDES.length - 1 ? '  →' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  logoImage: {
    width: 26,
    height: 26,
  },
  brandTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginTop: -1,
  },
  skipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: '#E6F4F1',
  },
  skipBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F766E',
  },

  mainContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingBottom: 24,
    justifyContent: 'space-between',
  },
  animatedSlide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  illustrationContainer: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
    marginTop: 12,
    paddingBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#475569',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 21,
  },

  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 16,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: '#0F766E',
  },
  inactiveDot: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },

  ctaButton: {
    backgroundColor: '#0F766E',
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#0F766E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
