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

const LoginScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const isFocused = useIsFocused();

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);

  // Hide the default React Navigation header to remove the white space
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false, 
    });
  }, [navigation]);

  useEffect(() => {
    if (error && isFocused) {
      Alert.alert('Login Failed', error);
      dispatch(clearError());
    }
  }, [error, isFocused]);

  const handleLogin = () => {
    if (!form.email || !form.password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }
    dispatch(loginVendor(form));
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="briefcase" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Vendor Login</Text>
          <Text style={styles.subtitle}>Manage your turf bookings</Text>
        </View>

        {/* Form */}
        <View style={[styles.card, SHADOWS.md]}>
          
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputContainer}>
            <Feather name="mail" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="vendor@example.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
            />
          </View>

          <Text style={styles.label}>Password</Text>
          <View style={[styles.inputContainer, { marginBottom: 12 }]}>
            <Feather name="lock" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Enter password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPass}
              value={form.password}
              onChangeText={(v) => setForm({ ...form, password: v })}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? "eye-off" : "eye"} size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Added a Forgot Password link since it's standard for professional layouts */}
          <TouchableOpacity onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Text style={styles.btnText}>Login</Text>
                <Feather name="arrow-right" size={20} color={colors.onAccent} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerLink}>
            <Text style={styles.registerText}>
              New vendor?{' '}
              <Text style={{ color: colors.primary, fontWeight: '700' }}>Register here</Text>
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background 
  },
  content: { 
    padding: SIZES.paddingLg, 
    paddingTop: 80,
    justifyContent: 'center'
  },
  
  header: { alignItems: 'center', marginBottom: 40 },
  iconContainer: {
    backgroundColor: colors.primary + '15',
    padding: 24,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border
  },
  title: { fontSize: SIZES.xxxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: SIZES.base, color: colors.textSecondary, marginTop: 8 },
  
  card: {
    backgroundColor: colors.card || colors.background,
    borderRadius: SIZES.radiusLg,
    padding: SIZES.paddingLg,
    borderWidth: 1,
    borderColor: colors.border
  },
  
  label: { 
    fontSize: SIZES.sm, 
    fontWeight: '600', 
    color: colors.text, 
    marginBottom: 8, 
    marginTop: 10 
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg || colors.border,
    borderRadius: SIZES.radius,
    marginBottom: 10,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 14,
    fontSize: SIZES.base,
    color: colors.text,
  },
  eye: { padding: 14 },
  
  forgotLink: {
    alignSelf: 'flex-end',
    marginBottom: 24,
  },
  forgotText: {
    fontSize: SIZES.sm,
    color: colors.primary,
    fontWeight: '600',
  },
  
  btn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: SIZES.radius,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnText: { color: colors.onAccent, fontSize: SIZES.base + 1, fontWeight: '700' },
  
  registerLink: { alignItems: 'center', marginTop: 24 },
  registerText: { fontSize: SIZES.sm, color: colors.textSecondary },
});

export default LoginScreen;