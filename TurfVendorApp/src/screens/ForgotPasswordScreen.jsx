import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import { forgotPasswordApi, verifyResetOtpApi, resetPasswordApi } from '../api/auth';

const ForgotPasswordScreen = ({ navigation }) => {
  const { colors } = useTheme();

  // Step state: 1 = Email Input, 2 = OTP Input, 3 = Reset Password Input
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    let interval = null;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [resendTimer]);

  // Step 1: Send OTP to email
  const handleSendOtp = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      Alert.alert('Required', 'Please enter a valid registered email address.');
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPasswordApi(cleanEmail);
      setLoading(false);
      setResendTimer(60);
      setStep(2);
      Alert.alert(
        'Code Sent',
        res?.message || `A 4-digit verification code has been sent to ${cleanEmail}. Please check your inbox and spam folder.`
      );
    } catch (err) {
      setLoading(false);
      Alert.alert('Error', err.message || 'Failed to send verification code. Please try again.');
    }
  };

  // Step 2: Verify 4-digit OTP
  const handleVerifyOtp = async () => {
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 4) {
      Alert.alert('Required', 'Please enter the 4-digit verification code sent to your email.');
      return;
    }

    try {
      setLoading(true);
      const res = await verifyResetOtpApi(email.trim(), cleanOtp);
      setLoading(false);
      if (res?.resetToken) {
        setResetToken(res.resetToken);
        setStep(3);
      } else {
        Alert.alert('Error', 'Invalid verification response. Please try again.');
      }
    } catch (err) {
      setLoading(false);
      Alert.alert('Verification Failed', err.message || 'Invalid verification code. Please check and try again.');
    }
  };

  // Step 3: Set New Password
  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Invalid Password', 'New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'Passwords do not match. Please re-enter your password.');
      return;
    }

    try {
      setLoading(true);
      const res = await resetPasswordApi({
        email: email.trim(),
        resetToken,
        newPassword,
      });
      setLoading(false);
      Alert.alert(
        'Success',
        res?.message || 'Your password has been reset successfully. Please sign in with your new password.',
        [
          {
            text: 'Sign In Now',
            onPress: () => navigation.navigate('Login'),
          },
        ]
      );
    } catch (err) {
      setLoading(false);
      Alert.alert('Reset Failed', err.message || 'Failed to reset password. Please start over.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Back Button Header */}
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (step > 1 ? setStep(step - 1) : navigation.goBack())}
        >
          <Feather name="arrow-left" size={22} color={colors.text} />
          <Text style={[styles.backText, { color: colors.text }]}>
            {step === 1 ? 'Back to Sign In' : 'Previous Step'}
          </Text>
        </TouchableOpacity>

        {/* Header Title */}
        <View style={styles.header}>
          <View style={[styles.iconBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
            <Feather name={step === 1 ? 'mail' : step === 2 ? 'shield' : 'lock'} size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 1 ? 'Forgot Password?' : step === 2 ? 'Verify 4-Digit Code' : 'Reset Password'}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {step === 1
              ? 'Enter your registered vendor email address below to receive a 4-digit verification code.'
              : step === 2
              ? `Enter the 4-digit verification code sent to ${email.trim()}.`
              : 'Create a strong new password for your vendor account.'}
          </Text>
        </View>

        {/* Step 1: Email Form */}
        {step === 1 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.md]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>REGISTERED VENDOR EMAIL</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Feather name="mail" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="vendor@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.75 }, SHADOWS.sm]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Send Reset Code</Text>
                  <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: OTP Verification Form */}
        {step === 2 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.md]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>4-DIGIT VERIFICATION CODE</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Feather name="key" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.otpInput, { color: colors.text }]}
                placeholder="••••"
                placeholderTextColor={colors.textSecondary}
                keyboardType="number-pad"
                maxLength={4}
                value={otp}
                onChangeText={setOtp}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.75 }, SHADOWS.sm]}
              onPress={handleVerifyOtp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Verify Code</Text>
                  <Feather name="check-circle" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              {resendTimer > 0 ? (
                <Text style={[styles.resendText, { color: colors.textSecondary }]}>
                  Resend code in <Text style={{ color: colors.primary, fontWeight: '700' }}>{resendTimer}s</Text>
                </Text>
              ) : (
                <TouchableOpacity onPress={handleSendOtp} disabled={loading}>
                  <Text style={[styles.resendLink, { color: colors.primary }]}>Didn't get the code? Resend Email</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Step 3: New Password Form */}
        {step === 3 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.md]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>NEW PASSWORD</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border, marginBottom: 16 }]}>
              <Feather name="lock" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Minimum 6 characters"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPass}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity style={styles.eye} onPress={() => setShowPass(!showPass)}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { color: colors.textSecondary }]}>CONFIRM NEW PASSWORD</Text>
            <View style={[styles.inputContainer, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              <Feather name="check-square" size={18} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="Re-enter new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showConfirmPass}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity style={styles.eye} onPress={() => setShowConfirmPass(!showConfirmPass)}>
                <Feather name={showConfirmPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: colors.primary, marginTop: 20 }, loading && { opacity: 0.75 }, SHADOWS.sm]}
              onPress={handleResetPassword}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>Update Password & Sign In</Text>
                  <Feather name="check" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SIZES.paddingLg,
    paddingTop: 40,
    paddingBottom: 40,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  backText: {
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.sm,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  card: {
    borderRadius: SIZES.radiusLg,
    padding: 22,
    borderWidth: 1,
  },
  label: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    marginBottom: 20,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: SIZES.sm,
  },
  otpInput: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: 8,
  },
  eye: {
    padding: 12,
  },
  btn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 18,
  },
  resendText: {
    fontSize: SIZES.xs,
    fontWeight: '500',
  },
  resendLink: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
});

export default ForgotPasswordScreen;