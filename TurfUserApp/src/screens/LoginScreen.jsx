import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { sendOtp, googleLogin } from '../redux/authSlice';
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

  const [mode, setMode]   = useState('select'); // 'select' | 'phone'
  const [phone, setPhone] = useState('');
  const [otpLoading, setOtpLoading]       = useState(false);
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

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const profile = await signInWithGoogle();
      await dispatch(googleLogin(profile)).unwrap();
    } catch (e) {
      if (e?.code !== '12501') {
        Alert.alert('Google Sign-In Failed', e.message || 'Please try again');
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
                <Text style={[styles.subtitle, { color: C.subtext }]}>
                  Enter your 10-digit mobile number for instant verification
                </Text>

                <View style={[styles.phoneRow, { borderColor: C.borderFocus || C.primary, backgroundColor: C.bgSoft }]}>
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

                <PrimaryButton
                  title="Send Verification OTP →"
                  onPress={handleSendOtp}
                  loading={otpLoading}
                  style={{ marginBottom: 12 }}
                />

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
  phoneRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, marginBottom: SPACING.lg },
  flagWrap:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countryCode:  { fontSize: 15, fontWeight: '700' },
  verticalDivider: { width: 1, height: 24, marginHorizontal: 10 },
  phoneInput:   { flex: 1, paddingVertical: 14, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  registerRow:  { alignItems: 'center', marginTop: 4, marginBottom: 8 },
  registerText: { fontSize: 13 },
  footNoteRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 14 },
  footNote:     { fontSize: 11, fontWeight: '500' },
});