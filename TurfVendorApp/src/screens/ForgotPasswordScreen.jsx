// @theme-ready ✅
import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { forgotPassword, clearError } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const ForgotPasswordScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((s) => s.auth);
  const [email, setEmail] = useState('');

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Update Header Colors based on Theme to fix any white space issues[cite: 5]
  useLayoutEffect(() => {
    navigation.setOptions({
      headerStyle: {
        backgroundColor: colors.background,
        elevation: 0,
        shadowOpacity: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.border || 'transparent',
      },
      headerTintColor: colors.text,
      headerTitleStyle: {
        color: colors.text,
        fontWeight: '700',
      },
    });
  }, [navigation, colors]);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error]);

  const handleSend = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your registered email');
      return;
    }
    const result = await dispatch(forgotPassword(email));
    if (forgotPassword.fulfilled.match(result)) {
      navigation.navigate('CheckEmail', { email });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Feather name="key" size={48} color={colors.primary} />
          </View>
          <Text style={styles.title}>Forgot Password?</Text>
          <Text style={styles.subtitle}>
            Enter your account email and we'll send you instructions to reset your password.
          </Text>
        </View>

        <View style={[styles.card, SHADOWS.md]}>
          <Text style={styles.label}>Email address</Text>
          <TextInput
            style={styles.input}
            placeholder="vendor@example.com"
            placeholderTextColor={colors.textSecondary}
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={setEmail}
          />

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Feather name="send" size={18} color={colors.onAccent} style={{ marginRight: 8 }} />
                <Text style={styles.btnText}>Send Reset Link</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backLink}>
            <Feather name="arrow-left" size={16} color={colors.textSecondary} style={{ marginRight: 6 }} />
            <Text style={styles.backText}>Back to Login</Text>
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
  header: { alignItems: 'center', marginBottom: 32 },
  iconContainer: {
    backgroundColor: colors.primary + '15',
    padding: 20,
    borderRadius: 50,
    marginBottom: 20,
  },
  title: { fontSize: SIZES.xxl, fontWeight: '800', color: colors.text },
  subtitle: { 
    fontSize: SIZES.base, 
    color: colors.textSecondary, 
    marginTop: 12, 
    textAlign: 'center', 
    lineHeight: 22 
  },
  card: { 
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radiusLg, 
    padding: SIZES.paddingLg,
    borderWidth: 1,
    borderColor: colors.border
  },
  label: { fontSize: SIZES.sm, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: {
    backgroundColor: colors.inputBg || colors.border, 
    borderRadius: SIZES.radius,
    paddingHorizontal: 16, 
    paddingVertical: 14, 
    fontSize: SIZES.base, 
    color: colors.text,
  },
  btn: { 
    flexDirection: 'row',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius, 
    paddingVertical: 16, 
    alignItems: 'center', 
    justifyContent: 'center',
    marginTop: 24 
  },
  btnText: { color: colors.onAccent, fontSize: SIZES.base, fontWeight: '700' },
  backLink: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 24 
  },
  backText: { fontSize: SIZES.sm, color: colors.textSecondary, fontWeight: '600' },
});

export default ForgotPasswordScreen;