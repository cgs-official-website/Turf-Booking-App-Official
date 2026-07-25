// @theme-ready ✅
import React, { useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground, Image } from 'react-native';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// Optional background/logo images — see src/assets/README.md for the full
// image list. If the files below don't exist yet, this screen still renders
// fine (falls back to a plain dark-green background + icon logo).
let bgImage = null;
let logoImage = null;
try { bgImage = require('../assets/turf-stadium-bg.png'); } catch (e) {}
try { logoImage = require('../assets/logo.png'); } catch (e) {}

const LandingScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Remove the white space at the top completely for the Landing screen
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, // Best for landing screens with background images
    });
  }, [navigation]);

  const content = (
    <View style={styles.overlay}>
      <View style={styles.top}>
        {logoImage ? (
          <Image source={logoImage} style={styles.logo} resizeMode="contain" />
        ) : (
          <View style={styles.iconContainer}>
            <Feather name="layers" size={56} color={colors.primary} />
          </View>
        )}
      </View>

      <View style={[styles.card, SHADOWS.md]}>
        <Text style={styles.title}>Grow Your Turf Business</Text>
        <Text style={styles.subtitle}>
          Manage bookings, pricing, slots and customers from one place.
        </Text>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('Register')}>
          <Feather name="user-plus" size={18} color={colors.onAccent} style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>Create Account</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('Login')}>
          <Feather name="log-in" size={18} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.secondaryBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (bgImage) {
    return (
      <ImageBackground source={bgImage} style={styles.container} resizeMode="cover">
        {/* Dark overlay for dark mode to make text/cards more readable over images */}
        {isDark && <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.6)' }]} />}
        {content}
      </ImageBackground>
    );
  }

  return <View style={styles.container}>{content}</View>;
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    justifyContent: 'flex-end' 
  },
  overlay: { 
    flex: 1, 
    justifyContent: 'space-between' 
  },
  top: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  logo: { width: 120, height: 120 },
  iconContainer: {
    backgroundColor: colors.card || colors.background,
    padding: 24,
    borderRadius: 60,
    elevation: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: colors.border
  },
  card: {
    backgroundColor: colors.card || colors.background,
    borderTopLeftRadius: 32, // Made it slightly more rounded for a premium feel
    borderTopRightRadius: 32,
    padding: SIZES.paddingLg,
    paddingTop: 32,
    paddingBottom: 40,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },
  title: { 
    fontSize: SIZES.xxl, 
    fontWeight: '800', 
    color: colors.text, 
    marginBottom: 12 
  },
  subtitle: { 
    fontSize: SIZES.base, 
    color: colors.textSecondary, 
    marginBottom: 32, 
    lineHeight: 22 
  },
  primaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius,
    paddingVertical: 16, 
    alignItems: 'center', 
    marginBottom: 16,
  },
  primaryBtnText: { 
    color: colors.onAccent, 
    fontSize: SIZES.base, 
    fontWeight: '700' 
  },
  secondaryBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    borderWidth: 1.5, 
    borderColor: colors.primary, 
    borderRadius: SIZES.radius,
    paddingVertical: 16, 
    alignItems: 'center',
  },
  secondaryBtnText: { 
    color: colors.primary, 
    fontSize: SIZES.base, 
    fontWeight: '700' 
  },
});

export default LandingScreen;