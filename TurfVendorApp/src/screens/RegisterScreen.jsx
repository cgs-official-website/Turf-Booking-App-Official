// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Image, ImageBackground,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// ─── Assets ─────────────────────────────────────────────────────────────────
// src/assets/ folder contains logo and turf-strip-bg.
const LOGO = require('../assets/logo.png');
const TOP_STRIP_BG = require('../assets/turf-strip-bg.jpg');

const Field = ({ label, placeholder, keyboardType, secureTextEntry, value, onChange, styles, colors }) => (
  <>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.inputContainer}>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={keyboardType || 'default'}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        value={value}
        onChangeText={onChange}
      />
    </View>
  </>
);

const RegisterScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [avatar, setAvatar] = useState(null);

  // Hide default navigation header to remove white space above custom strip
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const set = (key) => (v) => setForm((prev) => ({ ...prev, [key]: v }));

  const handlePickAvatar = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.7, selectionLimit: 1 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets && response.assets[0]?.uri;
        if (uri) setAvatar(uri);
      }
    );
  };

  const handleRegister = () => {
    if (!form.name || !form.email || !form.phone || !form.password || !form.confirmPassword) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    if (form.phone.trim().length !== 10) {
      Alert.alert('Error', 'Enter a valid 10 digit phone number');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    
    const { confirmPassword, ...payload } = form;
    navigation.navigate('Terms', { formData: payload, avatar });
  };

  const handleGoogleSignIn = () => {
    Alert.alert('Coming soon', 'Google sign-in integration is not yet available.');
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top strip with back button + logo */}
        <ImageBackground source={TOP_STRIP_BG} style={styles.topStrip} resizeMode="cover">
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <Feather name="arrow-left" size={20} color={colors.onAccent} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </ImageBackground>

        <View style={styles.logoWrap}>
          <View style={[styles.logoCircle, SHADOWS.md]}>
            <Image source={LOGO} style={styles.logoImg} resizeMode="contain" />
          </View>
        </View>

        {/* Form card */}
        <View style={styles.card}>
          <TouchableOpacity style={styles.avatarWrap} onPress={handlePickAvatar} activeOpacity={0.8}>
            <View style={styles.avatarCircle}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <Feather name="user" size={36} color={colors.textSecondary} />
              )}
            </View>
            <View style={styles.editBadge}>
              <Feather name="edit-2" size={12} color={colors.onAccent} />
            </View>
          </TouchableOpacity>

          <Field label="Name" placeholder="Enter your name" value={form.name} onChange={set('name')} styles={styles} colors={colors} />
          <Field label="Email address" placeholder="Enter your e-mail" keyboardType="email-address" value={form.email} onChange={set('email')} styles={styles} colors={colors} />
          <Field label="Phone number" placeholder="Enter your phone number" keyboardType="number-pad" value={form.phone} onChange={set('phone')} styles={styles} colors={colors} />
          <Field label="Password" placeholder="Create your Password" secureTextEntry value={form.password} onChange={set('password')} styles={styles} colors={colors} />
          <Field label="Confirm Password" placeholder="Re-enter your password" secureTextEntry value={form.confirmPassword} onChange={set('confirmPassword')} styles={styles} colors={colors} />

          <TouchableOpacity style={styles.signUpBtn} onPress={handleRegister} activeOpacity={0.85}>
            <Text style={styles.signUpText}>Sign Up</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.googleBtn} onPress={handleGoogleSignIn} activeOpacity={0.7}>
            <Feather name="globe" size={18} color={colors.text} />
            <Text style={styles.googleText}>Sign in with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.loginLink} activeOpacity={0.7}>
            <Text style={styles.loginText}>
              Already have an account?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { paddingBottom: 40 },

  topStrip: {
    height: 140,
    backgroundColor: colors.primary,
    paddingTop: 46,
    paddingHorizontal: SIZES.paddingLg,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backText: { color: colors.onAccent, fontSize: SIZES.base, fontWeight: '600' },

  logoWrap: { alignItems: 'center', marginTop: -60 },
  logoCircle: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: colors.card || colors.background,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  logoImg: { width: 64, height: 64 },

  card: {
    paddingHorizontal: SIZES.paddingLg, paddingTop: 24,
    backgroundColor: colors.card || colors.background,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -20,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 0,
  },

  avatarWrap: { alignSelf: 'center', marginBottom: 20 },
  avatarCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.inputBg || colors.border,
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatarImg: { width: '100%', height: '100%' },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.card || colors.background,
  },

  label: { fontSize: SIZES.sm, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 14 },
  inputContainer: {
    backgroundColor: colors.inputBg || colors.border,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
  },
  input: {
    paddingHorizontal: 16, paddingVertical: 14, fontSize: SIZES.base, color: colors.text,
  },

  signUpBtn: {
    backgroundColor: colors.primary, borderRadius: SIZES.radius,
    paddingVertical: 16, alignItems: 'center', marginTop: 30,
  },
  signUpText: { color: colors.onAccent, fontSize: SIZES.base, fontWeight: '700' },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: SIZES.radius, paddingVertical: 14, marginTop: 14,
    backgroundColor: colors.inputBg || 'transparent',
  },
  googleText: { fontSize: SIZES.base, color: colors.text, fontWeight: '600' },

  loginLink: { alignItems: 'center', marginTop: 22 },
  loginText: { fontSize: SIZES.sm, color: colors.textSecondary },
});

export default RegisterScreen;