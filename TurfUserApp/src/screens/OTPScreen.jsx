// src/screens/OTPScreen.jsx
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { verifyOtp, sendOtp } from '../redux/authSlice';
import { SPACING, RADIUS } from '../utils/theme';
import useTheme from '../hooks/useTheme';

const background = require('../assets/background.jpg');
const logo       = require('../assets/logo.png');

const OTP_LENGTH = 4;
const RESEND_SECONDS = 59;

export default function OTPScreen({ navigation, route }) {
  const { phone } = route.params;
  const dispatch = useDispatch();
  const { C } = useTheme();

  const [digits, setDigits]   = useState(Array(OTP_LENGTH).fill(''));
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer]     = useState(RESEND_SECONDS);
  const inputs = useRef([]);

  useEffect(() => {
    if (timer <= 0) return;
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleChange = (val, index) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...digits];
    next[index] = val;
    setDigits(next);
    setError(false);

    if (val && index < OTP_LENGTH - 1) inputs.current[index + 1]?.focus();

    if (val && index === OTP_LENGTH - 1) {
      const code = next.join('');
      if (code.length === OTP_LENGTH) handleVerify(code);
    }
  };

  const handleKeyPress = (e, index) => {
    if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async (code) => {
    setLoading(true);
    setError(false);
    try {
      await dispatch(verifyOtp({ phone, otp: code })).unwrap();
      // RootNavigator moves on to Location/Home automatically once token is set.
    } catch (e) {
      setError(true);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      Alert.alert('Verification Failed', e.message || 'Invalid OTP. Please try again');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await dispatch(sendOtp({ phone })).unwrap();
      setTimer(RESEND_SECONDS);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
    } catch (e) {
      Alert.alert('Failed', e.message || 'Could not resend OTP');
    }
  };

  return (
    <View style={styles.root}>
      <Image source={background} style={styles.bg} resizeMode="cover" />
      <View style={styles.overlay} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Text style={{ color: '#fff', fontSize: 15 }}>← Back</Text>
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={[styles.logoCircle, { backgroundColor: C.card }]}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.card }]}>
            <Text style={[styles.title, { color: C.text }]}>Enter your OTP</Text>
            <Text style={[styles.subtitle, { color: C.subtext }]}>
              Enter the {OTP_LENGTH} digit OTP sent to +91 {phone}
            </Text>

            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputs.current[i] = r)}
                  style={[
                    styles.otpBox,
                    { borderColor: error ? '#ef4444' : C.border, color: C.text, backgroundColor: C.bg },
                  ]}
                  keyboardType="number-pad"
                  maxLength={1}
                  value={d}
                  onChangeText={(val) => handleChange(val, i)}
                  onKeyPress={(e) => handleKeyPress(e, i)}
                />
              ))}
            </View>

            {error && (
              <Text style={styles.errorText}>Invalid OTP. Please try again</Text>
            )}

            <Text style={[styles.footNote, { color: C.subtext }]}>
              🔒 We will never share your number with anyone
            </Text>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
              onPress={() => handleVerify(digits.join(''))}
              disabled={loading || digits.join('').length !== OTP_LENGTH}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Verify</Text>
              }
            </TouchableOpacity>

            <Text style={[styles.timerText, { color: C.subtext }]}>
              {timer > 0
                ? `Expect OTP in ${String(Math.floor(timer / 60)).padStart(2, '0')}:${String(timer % 60).padStart(2, '0')}`
                : ''}
            </Text>
            {timer <= 0 && (
              <TouchableOpacity onPress={handleResend} style={styles.registerRow}>
                <Text style={{ color: C.primary, fontWeight: '700', fontSize: 13 }}>Resend OTP</Text>
              </TouchableOpacity>
            )}
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
  backBtn:      { position: 'absolute', top: 56, left: SPACING.lg, zIndex: 10 },
  logoWrap:     { alignItems: 'center', marginBottom: -50, zIndex: 10 },
  logoCircle:   { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  logo:         { width: 90, height: 90 },
  card:         { borderRadius: RADIUS.xl, padding: SPACING.xl, paddingTop: 64 },
  title:        { fontSize: 22, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  subtitle:     { fontSize: 13, textAlign: 'center', marginBottom: SPACING.xl },
  otpRow:       { flexDirection: 'row', justifyContent: 'center', gap: 14, marginBottom: SPACING.md },
  otpBox:       { width: 54, height: 54, borderWidth: 1.5, borderRadius: RADIUS.md, textAlign: 'center', fontSize: 20, fontWeight: '700' },
  errorText:    { color: '#ef4444', fontSize: 12, textAlign: 'center', marginBottom: SPACING.sm },
  footNote:     { fontSize: 11, textAlign: 'center', marginBottom: SPACING.xl },
  primaryBtn:   { paddingVertical: 16, borderRadius: RADIUS.lg, alignItems: 'center', marginBottom: SPACING.md },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  timerText:    { fontSize: 12, textAlign: 'center' },
  registerRow:  { alignItems: 'center', marginTop: 8 },
});