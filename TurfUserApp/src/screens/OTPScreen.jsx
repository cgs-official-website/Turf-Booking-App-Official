import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import { verifyOtp, sendOtp } from '../redux/authSlice';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

const background = require('../assets/background.jpg');
const logo       = require('../assets/logo.png');

const OTP_LENGTH = 4;
const RESEND_SECONDS = 45;

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

    if (val && index < OTP_LENGTH - 1) {
      inputs.current[index + 1]?.focus();
    }

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
    if (code.length < OTP_LENGTH) return;
    setLoading(true);
    setError(false);
    try {
      await dispatch(verifyOtp({ phone, otp: code })).unwrap();
    } catch (e) {
      setError(true);
      setDigits(Array(OTP_LENGTH).fill(''));
      inputs.current[0]?.focus();
      Alert.alert('Verification Failed', e.message || 'Invalid OTP code. Please try again');
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
      <View style={[styles.overlay, { backgroundColor: C.overlay }]} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: 'rgba(15, 23, 42, 0.65)' }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={18} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.logoWrap}>
            <View style={[styles.logoCircle, { backgroundColor: C.card }, SHADOW.floating]}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.card }, SHADOW.card]}>
            <Text style={[styles.title, { color: C.text }]}>Enter Verification Code</Text>
            <Text style={[styles.subtitle, { color: C.subtext }]}>
              Enter the {OTP_LENGTH}-digit code sent to{' '}
              <Text style={{ fontWeight: '800', color: C.text }}>+91 {phone}</Text>
            </Text>

            <View style={styles.otpRow}>
              {digits.map((d, i) => (
                <TextInput
                  key={i}
                  ref={(r) => (inputs.current[i] = r)}
                  style={[
                    styles.otpBox,
                    {
                      borderColor: error
                        ? C.error
                        : (d ? C.primary : C.border),
                      color: C.text,
                      backgroundColor: C.bgSoft,
                    },
                    d ? SHADOW.subtle : null,
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
              <Text style={[styles.errorText, { color: C.error }]}>
                Invalid code. Please re-enter the correct OTP.
              </Text>
            )}

            <PrimaryButton
              title="Verify & Enter Arena"
              onPress={() => handleVerify(digits.join(''))}
              loading={loading}
              disabled={digits.join('').length !== OTP_LENGTH}
              style={{ marginBottom: 16 }}
            />

            {/* Timer & Resend */}
            <View style={styles.resendRow}>
              {timer > 0 ? (
                <Text style={[styles.timerText, { color: C.subtext }]}>
                  Resend code in{' '}
                  <Text style={{ fontWeight: '800', color: C.text }}>
                    00:{String(timer).padStart(2, '0')}
                  </Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                  <Text style={[styles.resendBtnText, { color: C.primary }]}>
                    Didn't receive code? <Text style={{ textDecorationLine: 'underline', fontWeight: '800' }}>Resend OTP</Text>
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.footNoteRow}>
              <Feather name="lock" size={12} color={C.caption} style={{ marginRight: 4 }} />
              <Text style={[styles.footNote, { color: C.caption }]}>
                Auto-verifying secure SMS message
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
  backBtn:      { position: 'absolute', top: 54, left: SPACING.lg, zIndex: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logoWrap:     { alignItems: 'center', marginBottom: -48, zIndex: 10 },
  logoCircle:   { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  logo:         { width: 75, height: 75 },
  card:         { borderRadius: RADIUS.xxl, padding: SPACING.xl, paddingTop: 60 },
  title:        { ...FONT.h1, fontSize: 21, textAlign: 'center', marginBottom: 4 },
  subtitle:     { ...FONT.body, fontSize: 13, textAlign: 'center', marginBottom: SPACING.xl },
  otpRow:       { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: SPACING.md },
  otpBox:       { width: 56, height: 58, borderWidth: 1.5, borderRadius: RADIUS.lg, textAlign: 'center', fontSize: 22, fontWeight: '800' },
  errorText:    { fontSize: 12, textAlign: 'center', marginBottom: SPACING.sm, fontWeight: '600' },
  resendRow:    { alignItems: 'center', marginBottom: 12 },
  timerText:    { fontSize: 13, fontWeight: '500' },
  resendBtnText:{ fontSize: 13, fontWeight: '600' },
  footNoteRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 8 },
  footNote:     { fontSize: 11, fontWeight: '500' },
});