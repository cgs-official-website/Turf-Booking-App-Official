import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { sendOtp, googleLogin, mobileLoginUser } from '../redux/authSlice';
import { signInWithGoogle } from '../utils/googleSignIn';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

const background = require('../assets/background.jpg');
const logo       = require('../assets/logo.png');

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const { C, dark } = useTheme();

  const [mode, setMode]                   = useState('select'); // 'select' | 'phone'
  const [mobileOption, setMobileOption]   = useState('otp');    // 'otp' | 'direct'
  const [phone, setPhone]                 = useState('');
  const [otpLoading, setOtpLoading]       = useState(false);
  const [passLoading, setPassLoading]     = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleSendOtp = async () => {
    const clean = phone.trim();
    if (clean.length !== 10) {
      Alert.alert('Invalid number', 'Please enter a valid 10-digit mobile number');
      return;
    }
    setOtpLoading(true);
    try {
      await dispatch(sendOtp({ phone: clean })).unwrap();
      navigation.navigate('OTP', { phone: clean });
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not send OTP, please try again');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleMobileLogin = async () => {
    const cleanPhone = phone.trim();

    if (cleanPhone.length !== 10) {
      Alert.alert('Invalid Number', 'Please enter a valid 10-digit mobile number');
      return;
    }

    setPassLoading(true);
    try {
      await dispatch(mobileLoginUser({ phone: cleanPhone })).unwrap();
    } catch (e) {
      Alert.alert('Authentication Failed', e.message || 'Could not log in with mobile number. Please try again.');
    } finally {
      setPassLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const profile = await signInWithGoogle();
      await dispatch(googleLogin(profile)).unwrap();
    } catch (e) {
      if (e?.code !== '12501' && e?.code !== 'SIGN_IN_CANCELLED') {
        const isDevErr = String(e?.message || e).includes('DEVELOPER_ERROR');
        const errorMsg = typeof e === 'string' ? e : (e?.message || JSON.stringify(e));
        const msg = isDevErr
          ? 'Google Sign-In requires adding the Android SHA-1 fingerprint to Firebase Console.\n\nPlease use "Continue with Mobile" or "Sign in with Email" to log in.'
          : (errorMsg || 'Could not complete Google Sign-In. Please try again or use Mobile OTP.');
        Alert.alert('Google Sign-In', msg);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <Image source={background} style={styles.bg} resizeMode="cover" />
      <View style={[styles.overlay, { backgroundColor: C.overlay }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          {/* Floating Logo Badge */}
          <View style={styles.logoWrap}>
            <View style={[styles.logoCircle, { backgroundColor: C.card }, SHADOW.floating]}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
          </View>

          {/* Main Card Surface */}
          <View style={[styles.card, { backgroundColor: C.card }, SHADOW.card]}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: C.text }]}>Let's get started</Text>
              <Feather name="activity" size={20} color={C.primary} style={{ marginLeft: 6 }} />
            </View>

            {mode === 'select' ? (
              <>
                <Text style={[styles.subtitle, { color: C.subtext }]}>
                  Book verified turf grounds & track live matches
                </Text>

                <PrimaryButton
                  title="Continue with Mobile"
                  icon={<Feather name="phone" size={18} color="#FFFFFF" />}
                  onPress={() => setMode('phone')}
                  style={{ marginBottom: 12 }}
                />

                <SecondaryButton
                  title="Sign in with Google"
                  icon={<Ionicons name="logo-google" size={18} color="#EA4335" />}
                  onPress={handleGoogle}
                  disabled={googleLoading}
                  style={{ marginBottom: 12 }}
                />

                <SecondaryButton
                  title="Sign in with Email"
                  icon={<Feather name="mail" size={18} color={C.primary} />}
                  onPress={() => navigation.navigate('Login2')}
                  outlined={false}
                  style={{ marginBottom: 16 }}
                />

                <TouchableOpacity
                  onPress={() => navigation.navigate('Register')}
                  style={styles.registerRow}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.registerText, { color: C.subtext }]}>
                    New player?{' '}
                    <Text style={{ color: C.primary, fontWeight: '800' }}>Create Account</Text>
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Segmented Options for Mobile Sign-in */}
                <View style={[styles.tabContainer, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
                  <TouchableOpacity
                    style={[
                      styles.tabButton,
                      mobileOption === 'otp' && [styles.tabActive, { backgroundColor: C.primary }]
                    ]}
                    onPress={() => setMobileOption('otp')}
                    activeOpacity={0.8}
                  >
                    <Feather name="message-square" size={13} color={mobileOption === 'otp' ? '#FFFFFF' : C.subtext} style={{ marginRight: 5 }} />
                    <Text style={[styles.tabText, { color: mobileOption === 'otp' ? '#FFFFFF' : C.subtext }]}>
                      Send OTP
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tabButton,
                      mobileOption === 'direct' && [styles.tabActive, { backgroundColor: C.primary }]
                    ]}
                    onPress={() => setMobileOption('direct')}
                    activeOpacity={0.8}
                  >
                    <Feather name="smartphone" size={13} color={mobileOption === 'direct' ? '#FFFFFF' : C.subtext} style={{ marginRight: 5 }} />
                    <Text style={[styles.tabText, { color: mobileOption === 'direct' ? '#FFFFFF' : C.subtext }]}>
                      Login using Mobile
                    </Text>
                  </TouchableOpacity>
                </View>

                <Text style={[styles.subtitle, { color: C.subtext, marginBottom: SPACING.md }]}>
                  {mobileOption === 'otp'
                    ? 'Enter your 10-digit mobile number for SMS OTP verification'
                    : 'Enter your 10-digit mobile number to log in directly'}
                </Text>

                <View style={[styles.phoneRow, { borderColor: C.borderFocus || C.primary, backgroundColor: C.bgSoft, marginBottom: SPACING.lg }]}>
                  <View style={styles.flagWrap}>
                    <Feather name="globe" size={15} color={C.primary} />
                    <Text style={[styles.countryCode, { color: C.text }]}>+91</Text>
                  </View>
                  <View style={[styles.verticalDivider, { backgroundColor: C.border }]} />
                  <TextInput
                    style={[styles.phoneInput, { color: C.text }]}
                    placeholder="98765 43210"
                    placeholderTextColor={C.caption}
                    keyboardType="number-pad"
                    maxLength={10}
                    value={phone}
                    onChangeText={setPhone}
                    autoFocus
                  />
                </View>

                {mobileOption === 'otp' ? (
                  <PrimaryButton
                    title="Send Verification OTP →"
                    onPress={handleSendOtp}
                    loading={otpLoading}
                    style={{ marginBottom: 12 }}
                  />
                ) : (
                  <PrimaryButton
                    title="Login Using Mobile Number →"
                    onPress={handleMobileLogin}
                    loading={passLoading}
                    style={{ marginBottom: 12 }}
                  />
                )}

                <TouchableOpacity
                  onPress={() => setMode('select')}
                  style={styles.registerRow}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.registerText, { color: C.primary, fontWeight: '700' }]}>
                    ← Choose other sign-in method
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.footNoteRow}>
              <Feather name="shield" size={12} color={C.caption} style={{ marginRight: 4 }} />
              <Text style={[styles.footNote, { color: C.caption }]}>
                Secured by Turf Booking Security Shield
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
  overlay:      { position: 'absolute', width: '100%', height: '100%' },
  kav:          { flex: 1 },
  scroll:       { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: SPACING.lg, paddingBottom: 32 },
  logoWrap:     { alignItems: 'center', marginBottom: -48, zIndex: 10 },
  logoCircle:   { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  logo:         { width: 75, height: 75 },
  card:         { borderRadius: RADIUS.xxl, padding: SPACING.xl, paddingTop: 60 },
  titleRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  title:        { ...FONT.h1, fontSize: 22 },
  emoji:        { fontSize: 20, marginLeft: 6 },
  subtitle:     { ...FONT.body, fontSize: 13, textAlign: 'center', marginBottom: SPACING.xl },
  tabContainer: { flexDirection: 'row', borderRadius: RADIUS.md, borderWidth: 1, padding: 3, marginBottom: 14 },
  tabButton:    { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: RADIUS.sm },
  tabActive:    { elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText:      { fontSize: 12, fontWeight: '700' },
  phoneRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.md },
  flagWrap:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countryCode:  { fontSize: 15, fontWeight: '700' },
  verticalDivider: { width: 1, height: 24, marginHorizontal: 10 },
  phoneInput:   { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  inputIcon:    { marginRight: 10 },
  input:        { flex: 1, paddingVertical: 14, fontSize: 15, fontWeight: '600' },
  eyeWrap:      { padding: 6 },
  registerRow:  { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  registerText: { fontSize: 13 },
  footNoteRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  footNote:     { fontSize: 11, fontWeight: '500' },
});