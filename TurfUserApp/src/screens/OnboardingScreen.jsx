import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useWindowDimensions, Image } from 'react-native';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme'; // <-- Dark mode custom hook proper ah inline add aiyachu

const SLIDES = [
  {
    image: require('../assets/onboarding1.png'),
    title: 'Find Turfs near you',
    desc: 'Discover nearby football cricket turfs instantly - no more searching or Booking',
  },
  {
    image: require('../assets/onboarding2.png'),
    title: 'Request slots in seconds',
    desc: 'Select your time and Send a request turf owners confirm quickly',
  },
  {
    image: require('../assets/onboarding3.png'),
    title: 'Get confirmed & play',
    desc: 'Discover nearby football cricket turfs instantly - no more searching or Booking',
  },
];

export default function OnboardingScreen({ navigation }) {
  const { C } = useTheme(); // <-- Dynamic custom theme colors read pannyachu
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const listRef = useRef(null);

  // Exact untouched functional logic machii
  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1 });
      setIndex(index + 1);
    } else {
      navigation.replace('Login');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <TouchableOpacity style={styles.skip} onPress={() => navigation.replace('Login')}>
        <Text style={[styles.skipText, { color: C.subtext }]}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <Image
              source={item.image}
              style={styles.slideImage}
              resizeMode="contain"
            />
            <Text style={[styles.title, { color: C.text }]}>{item.title}</Text>
            <Text style={[styles.desc, { color: C.subtext }]}>{item.desc}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <View 
            key={i} 
            style={[
              styles.dot, 
              { backgroundColor: C.border },
              i === index && [styles.dotActive, { backgroundColor: C.primary }]
            ]} 
          />
        ))}
      </View>

      <TouchableOpacity style={[styles.button, { backgroundColor: C.primary }]} onPress={next}>
        <Text style={styles.buttonText}>{index === SLIDES.length - 1 ? 'Get Started' : 'Next'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  // Structure alignments layout dynamic-less blocks layout rules thaan inga static-ah manage aaguthu
  container:   { flex: 1 },
  skip:        { position: 'absolute', top: 56, right: SPACING.lg, zIndex: 10 },
  skipText:    { ...FONT.body, fontWeight: '600' },
  slide:       { alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxl, paddingTop: 120 },
  title:       { ...FONT.h1, textAlign: 'center', marginBottom: SPACING.md },
  desc:        { ...FONT.body, textAlign: 'center', lineHeight: 20 },
  dots:        { flexDirection: 'row', justifyContent: 'center', marginBottom: SPACING.xl, gap: 6 },
  dot:         { width: 8, height: 8, borderRadius: 4 },
  dotActive:   { width: 22 },
  button:      { marginHorizontal: SPACING.xl, marginBottom: SPACING.xxl, paddingVertical: SPACING.lg, borderRadius: RADIUS.lg, alignItems: 'center' },
  buttonText:  { color: '#fff', ...FONT.button },
  slideImage:  { width: '100%', height: 340, marginBottom: SPACING.xxl },
});