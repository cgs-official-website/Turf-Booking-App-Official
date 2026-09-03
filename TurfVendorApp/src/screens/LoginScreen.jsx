// @theme-ready ✅
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { loginVendor, clearError } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const isFocused = useIsFocused();

  const { colors, isDark } = useTheme();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (error && isFocused) {
      Alert.alert('Login Failed', error);
      dispatch(clearError());
    }
  }, [error, isFocused]);

  const handleLogin = () => {
    if (!form.email.trim() || !form.password) {
      Alert.alert('Required Fields', 'Please enter both email address and password.');
      return;
    }
    dispatch(loginVendor({ email: form.email.trim(), password: form.password }));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Decorative Top Glow */}
        <View style={[styles.topGlow, { backgroundColor: colors.primaryLight }]} />

        {/* Hero Header */}
        <View style={styles.header}>
          <View style={[styles.logoBadge, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <View style={[styles.logoInner, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="football" size={28} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to manage your turf, slots & player bookings
          </Text>
        </View>

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.md]}>
          {/* Email Input */}
          <Text style={[styles.label, { color: colors.text }]}>Email Address</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'email' ? colors.primary : colors.border },
              focusedField === 'email' && styles.inputContainerFocused,
            ]}
          >
            <Feather
              name="mail"
              size={18}
              color={focusedField === 'email' ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. partner@turfbooking.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />
            {form.email.length > 0 && (
              <TouchableOpacity onPress={() => setForm({ ...form, email: '' })} style={styles.clearBtn}>
                <Feather name="x-circle" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Password Input */}
          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Password</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'password' ? colors.primary : colors.border },
              focusedField === 'password' && styles.inputContainerFocused,
            ]}
          >
            <Feather
              name="lock"
              size={18}
              color={focusedField === 'password' ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="••••••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              value={form.password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Forgot Password Link */}
          <TouchableOpacity
            onPress={() => Alert.alert('Reset Password', 'Please contact support or your administrator to reset your vendor account password.')}
            style={styles.forgotLink}
            activeOpacity={0.7}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Sign In CTA Button */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: colors.primary }, loading && { opacity: 0.75 }, SHADOWS.sm]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.btnText}>Sign In to Dashboard</Text>
                <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer: Register New Turf */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>New partner with a sports facility?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Register')}
            style={[styles.registerBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.75}
          >
            <Feather name="plus-circle" size={16} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.registerBtnText, { color: colors.primary }]}>Register Your Turf</Text>
          </TouchableOpacity>
        </View>
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
    paddingTop: 50,
    paddingBottom: 40,
    justifyContent: 'center',
  },

  topGlow: {
    position: 'absolute',
    top: -100,
    left: '25%',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.35,
  },

  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 16,
  },
  logoInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.xxxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.sm,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
    paddingHorizontal: 20,
  },

  card: {
    borderRadius: SIZES.radiusLg,
    padding: 22,
    borderWidth: 1,
  },

  label: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
  },
  inputContainerFocused: {
    borderWidth: 1.5,
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
  eye: {
    padding: 12,
  },
  clearBtn: {
    padding: 12,
  },

  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: 10,
    marginBottom: 20,
  },
  forgotText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
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
    letterSpacing: 0.2,
  },

  footer: {
    alignItems: 'center',
    marginTop: 32,
  },
  footerText: {
    fontSize: SIZES.xs,
    fontWeight: '500',
    marginBottom: 10,
  },
  registerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  registerBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '800',
  },
});

export default LoginScreen;