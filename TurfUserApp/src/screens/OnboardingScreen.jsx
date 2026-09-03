import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Image, Dimensions, StatusBar, Animated, PanResponder,
} from 'react-native';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Feather from 'react-native-vector-icons/Feather';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

const SLIDES = [
  {
    id: '1',
    image: require('../assets/onboarding1.png'),
    title: 'Find Turfs Near You',
    desc: 'Discover nearby premium football & cricket turf arenas instantly with live slot availability.',
  },
  {
    id: '2',
    image: require('../assets/onboarding2.png'),
    title: 'Request Slots in Seconds',
    desc: 'Pick your preferred game time, book slots seamlessly, and get instant venue confirmation.',
  },
  {
    id: '3',
    image: require('../assets/onboarding3.png'),
    title: 'Get Confirmed & Play',
    desc: 'Invite your teammates, track live match scores, and dominate the local turf leaderboard.',
  },
];

export default function OnboardingScreen({ navigation }) {
  const { C, dark } = useTheme();
  const [index, setIndex] = useState(0);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateToSlide = (newIndex, direction = 1) => {
    // Fade out and shift slightly
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -30 * direction,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIndex(newIndex);
      slideAnim.setValue(30 * direction);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
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
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dx) > 20,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -50) {
          // Swiped left -> Next
          if (index < SLIDES.length - 1) {
            animateToSlide(index + 1, 1);
          } else {
            navigation.navigate('Login');
          }
        } else if (gestureState.dx > 50) {
          // Swiped right -> Prev
          if (index > 0) {
            animateToSlide(index - 1, -1);
          }
        }
      },
    })
  ).current;

  const currentSlide = SLIDES[index];

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* Top Header with Brand & Skip */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <View style={[styles.miniLogoWrap, { backgroundColor: C.primaryLight }]}>
            <Image source={require('../assets/logosm.png')} style={styles.miniLogo} resizeMode="contain" />
          </View>
          <Text style={[styles.brandTitle, { color: C.text }]}>NAMMA OORU TURF</Text>
        </View>

        <TouchableOpacity
          style={[styles.skipPill, { backgroundColor: dark ? '#334155' : '#F1F5F9' }]}
          onPress={handleSkip}
          activeOpacity={0.7}
        >
          <Text style={[styles.skipText, { color: C.primary }]}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Swipeable Slide View */}
      <View style={styles.contentWrap} {...panResponder.panHandlers}>
        <Animated.View
          style={[
            styles.slideCard,
            {
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <View style={styles.imageBox}>
            <Image
              source={currentSlide.image}
              style={styles.slideImage}
              resizeMode="contain"
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={[styles.slideTitle, { color: C.text }]}>{currentSlide.title}</Text>
            <Text style={[styles.slideDesc, { color: C.subtext }]}>{currentSlide.desc}</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Controls */}
      <View style={styles.bottomArea}>
        {/* Animated Indicator Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const isActive = i === index;
            return (
              <TouchableOpacity
                key={i}
                onPress={() => animateToSlide(i, i > index ? 1 : -1)}
                activeOpacity={0.7}
                style={styles.dotTouch}
              >
                <View
                  style={[
                    styles.dot,
                    { backgroundColor: C.border },
                    isActive && [styles.dotActive, { backgroundColor: C.primary }],
                  ]}
                />
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next / Get Started Action Button */}
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: C.primary }]}
          onPress={handleNext}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnText}>
            {index === SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Feather
            name={index === SLIDES.length - 1 ? 'check' : 'arrow-right'}
            size={18}
            color="#FFFFFF"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniLogoWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniLogo: {
    width: 22,
    height: 22,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  skipPill: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '800',
  },

  contentWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  slideCard: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageBox: {
    width: '100%',
    height: height > 700 ? 310 : 250,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  slideImage: {
    width: '95%',
    height: '100%',
  },
  textContainer: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  slideTitle: {
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  slideDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },

  bottomArea: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    paddingTop: 10,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    gap: 8,
  },
  dotTouch: {
    padding: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    borderRadius: 5,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#0CB053',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});