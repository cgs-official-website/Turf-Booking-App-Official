// src/screens/LoginScreen.jsx
// This is the "Let's get started" screen (kept the filename/route "Login" so
// RootNavigator + everything that navigates to 'Login' keeps working).
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { sendOtp, googleLogin } from '../redux/authSlice';
import { SPACING, RADIUS } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import { signInWithGoogle } from '../utils/googleSignIn';
import Icon from 'react-native-vector-icons/Ionicons';

const background = require('../assets/background.jpg');
const logo       = require('../assets/logo.png');

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { C } = useTheme();
  const { status } = useSelector((s) => s.auth);

  const [mode, setMode]   = useState('select'); // 'select' | 'phone'
  const [phone, setPhone] = useState('');
  const [otpLoading, setOtpLoading]       = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSendOtp = async () => {
    const clean = phone.trim();
    if (clean.length !== 10) {
      Alert.alert('Invalid number', 'Please enter a valid 10 digit mobile number');
      return;
    }
    setOtpLoading(true);
    try {
      await dispatch(sendOtp({ phone: clean })).unwrap();
      navigation.navigate('OTP', { phone: clean });
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not send OTP, try again');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const profile = await signInWithGoogle();
      // Navigation onward (Location vs Home) is handled automatically by
      // RootNavigator once token + locationSet update in the store.
      await dispatch(googleLogin(profile)).unwrap();
    } catch (e) {
      if (e?.code !== '12501') { // user cancelled the Google sheet — no need to alert
        Alert.alert('Google Sign-In Failed', e.message || 'Please try again');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={background} style={styles.bg} resizeMode="cover" />
      <View style={styles.overlay} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoWrap}>
            <View style={[styles.logoCircle, { backgroundColor: C.card }]}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.card }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: C.text }]}>Let's get started</Text>
              <Icon name="hand-right-outline" size={20} color={C.text} style={styles.titleIcon} />
            </View>

            {mode === 'select' ? (
              <>
                <Text style={[styles.subtitle, { color: C.subtext }]}>
                  Choose how you'd like to continue
                </Text>

                <TouchableOpacity
                  style={[styles.optionBtn, { borderColor: C.border }]}
                  onPress={() => setMode('phone')}
                >
                  <Icon name="call-outline" size={18} color={C.text} />
                  <Text style={[styles.optionText, { color: C.text }]}>Continue with phone</Text>
                </TouchableOpacity>

                <View style={styles.dividerRow}>
                  <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
                  <Text style={[styles.dividerText, { color: C.subtext }]}>or</Text>
                  <View style={[styles.dividerLine, { backgroundColor: C.border }]} />
                </View>

                <TouchableOpacity
                  style={[styles.optionBtn, { borderColor: C.border }, googleLoading && { opacity: 0.6 }]}
                  onPress={handleGoogle}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <ActivityIndicator color={C.text} />
                  ) : (
                    <>
                      <Icon name="logo-google" size={18} color="#EA4335" />
                      <Text style={[styles.optionText, { color: C.text }]}>Sign in with Google</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerRow}>
                  <Text style={[styles.registerText, { color: C.subtext }]}>
                    New here?{' '}
                    <Text style={{ color: C.primary, fontWeight: '700' }}>Create Account</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.subtitle, { color: C.subtext }]}>
                  Enter your mobile number to continue
                </Text>

                <View style={[styles.phoneRow, { borderColor: C.border }]}>
                  <Text style={[styles.countryCode, { color: C.text }]}>+91</Text>
                  <Icon name="call-outline" size={16} color={C.subtext} style={{ marginHorizontal: 8 }} />
                  <TextInput
                    style={[styles.phoneInput, { color: C.text }]}
                    placeholder="98765 43210"
                    placeholderTextColor={C.subtext}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    autoFocus
                  />
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: C.primary }, otpLoading && { opacity: 0.7 }]}
                  onPress={handleSendOtp}
                  disabled={otpLoading}
                >
                  {otpLoading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryBtnText}>Send OTP →</Text>
                  }
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setMode('select')} style={styles.registerRow}>
                  <Text style={[styles.registerText, { color: C.subtext }]}>← Back</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.footNoteRow}>
              <Icon name="lock-closed-outline" size={12} color={C.subtext} />
              <Text style={[styles.footNote, { color: C.subtext }]}>
                We will never share your information with anyone
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:         { flex: 1 },
  bg:           { position: 'absolute', width: '100%', height: '100%' },
  overlay:      { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.45)' },
  kav:          { flex: 1 },
  scroll:       { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: SPACING.lg, paddingBottom: 40 },
  logoWrap:     { alignItems: 'center', marginBottom: -50, zIndex: 10 },
  logoCircle:   { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  logo:         { width: 90, height: 90 },
  card:         { borderRadius: RADIUS.xl, padding: SPACING.xl, paddingTop: 64 },
  titleRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 6 },
  title:        { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  titleIcon:    { marginTop: 2 },
  subtitle:     { fontSize: 13, textAlign: 'center', marginBottom: SPACING.xl },
  optionBtn:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, borderWidth: 1, borderRadius: RADIUS.lg, paddingVertical: 14, marginBottom: 12 },
  optionText:   { fontSize: 15, fontWeight: '600' },
  dividerRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 8, gap: 10 },
  dividerLine:  { flex: 1, height: 1 },
  dividerText:  { fontSize: 12 },
  phoneRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  countryCode:  { fontSize: 15, fontWeight: '600' },
  phoneInput:   { flex: 1, paddingVertical: 14, fontSize: 15 },
  primaryBtn:   { paddingVertical: 16, borderRadius: RADIUS.lg, alignItems: 'center', marginBottom: SPACING.md },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerRow:  { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  registerText: { fontSize: 13 },
  footNoteRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4, marginTop: 8 },
  footNote:     { fontSize: 11, textAlign: 'center' },
});