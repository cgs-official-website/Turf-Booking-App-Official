// @theme-ready ✅
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { resetPassword, clearError } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const ResetPasswordScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const { email } = route.params || {};

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Hide default navigation header to remove white space above custom layout
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (error) { Alert.alert('Error', error); dispatch(clearError()); }
  }, [error]);

  const handleReset = async () => {
    if (!newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill both fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    const result = await dispatch(resetPassword({ email, newPassword }));
    if (resetPassword.fulfilled.match(result)) {
      Alert.alert('Success', 'Your password has been reset. Please log in.', [
        { text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="lock" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>New Password</Text>
          <Text style={styles.subtitle}>Create a new password for your account</Text>
        </View>

        <View style={[styles.card, SHADOWS.md]}>
          <Text style={styles.label}>New password</Text>
          <View style={styles.inputContainer}>
            <Feather name="key" size={18} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
          </View>

          <Text style={styles.label}>Confirm new password</Text>
          <View style={styles.inputContainer}>
            <Feather name="check-circle" size={18} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Re-enter password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
          </View>

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Text style={styles.btnText}>Reset Password</Text>
                <Feather name="arrow-right" size={20} color={colors.onAccent} style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: colors.background, 
    padding: SIZES.paddingLg, 
    justifyContent: 'center' 
  },
  header: { alignItems: 'center', marginBottom: 36 },
  iconContainer: {
    backgroundColor: colors.primary + '15',
    padding: 22,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: colors.text },
  subtitle: { fontSize: SIZES.base, color: colors.textSecondary, marginTop: 6, textAlign: 'center' },
  
  card: { 
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radiusLg, 
    padding: SIZES.paddingLg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: SIZES.sm, fontWeight: '600', color: colors.text, marginBottom: 8, marginTop: 14 },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg || colors.border,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    borderColor: colors.border,
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
  
  btn: { 
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius, 
    paddingVertical: 16, 
    alignItems: 'center', 
    marginTop: 28,
  },
  btnText: { color: colors.onAccent, fontSize: SIZES.base, fontWeight: '700' },
});

export default ResetPasswordScreen;