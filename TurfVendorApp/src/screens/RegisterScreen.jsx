// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, KeyboardAvoidingView, Platform,
  Image,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const RegisterScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [avatar, setAvatar] = useState(null);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const set = (key) => (v) => setForm((prev) => ({ ...prev, [key]: v }));

  const handlePickAvatar = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8, selectionLimit: 1 },
      (response) => {
        if (response.didCancel || response.errorCode) return;
        const uri = response.assets && response.assets[0]?.uri;
        if (uri) setAvatar(uri);
      }
    );
  };

  const handleRegister = () => {
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.password || !form.confirmPassword) {
      Alert.alert('Required Fields', 'Please fill in all registration fields.');
      return;
    }
    if (form.phone.trim().replace(/\D/g, '').length !== 10) {
      Alert.alert('Invalid Phone', 'Please enter a valid 10-digit mobile number.');
      return;
    }
    if (form.password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      Alert.alert('Password Mismatch', 'Password and Confirm Password do not match.');
      return;
    }

    const { confirmPassword, ...payload } = form;
    navigation.navigate('Terms', { formData: payload, avatar });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Partner Registration</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Header Title */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Register Your Turf</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join the verified turf network to list your facility and start taking online reservations
          </Text>
        </View>

        {/* Form Container */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          {/* Avatar Photo Picker */}
          <TouchableOpacity style={styles.avatarSection} onPress={handlePickAvatar} activeOpacity={0.8}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.inputBg, borderColor: colors.border }]}>
              {avatar ? (
                <Image source={{ uri: avatar }} style={styles.avatarImg} />
              ) : (
                <Feather name="user" size={36} color={colors.textSecondary} />
              )}
            </View>
            <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
              <Feather name="camera" size={13} color="#FFFFFF" />
            </View>
            <Text style={[styles.avatarLabel, { color: colors.primary }]}>
              {avatar ? 'Change Photo' : 'Upload Profile Photo'}
            </Text>
          </TouchableOpacity>

          {/* Full Name */}
          <Text style={[styles.label, { color: colors.text }]}>Owner / Vendor Name</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'name' ? colors.primary : colors.border },
            ]}
          >
            <Feather name="user" size={18} color={focusedField === 'name' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. Rahul Sharma"
              placeholderTextColor={colors.textSecondary}
              value={form.name}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              onChangeText={set('name')}
            />
          </View>

          {/* Email Address */}
          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Business Email</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'email' ? colors.primary : colors.border },
            ]}
          >
            <Feather name="mail" size={18} color={focusedField === 'email' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="e.g. rahul@greensports.in"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={form.email}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              onChangeText={set('email')}
            />
          </View>

          {/* Phone Number */}
          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Mobile Number</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'phone' ? colors.primary : colors.border },
            ]}
          >
            <View style={styles.phonePrefix}>
              <Text style={[styles.phonePrefixText, { color: colors.text }]}>+91</Text>
            </View>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="9876543210"
              placeholderTextColor={colors.textSecondary}
              keyboardType="number-pad"
              maxLength={10}
              value={form.phone}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              onChangeText={set('phone')}
            />
          </View>

          {/* Password */}
          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Create Password</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'password' ? colors.primary : colors.border },
            ]}
          >
            <Feather name="lock" size={18} color={focusedField === 'password' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Min 6 characters"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPass}
              autoCapitalize="none"
              value={form.password}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              onChangeText={set('password')}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowPass(!showPass)}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Confirm Password */}
          <Text style={[styles.label, { color: colors.text, marginTop: 14 }]}>Confirm Password</Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: colors.inputBg, borderColor: focusedField === 'confirmPassword' ? colors.primary : colors.border },
            ]}
          >
            <Feather name="shield" size={18} color={focusedField === 'confirmPassword' ? colors.primary : colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Re-enter your password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showConfirmPass}
              autoCapitalize="none"
              value={form.confirmPassword}
              onFocus={() => setFocusedField('confirmPassword')}
              onBlur={() => setFocusedField(null)}
              onChangeText={set('confirmPassword')}
            />
            <TouchableOpacity style={styles.eye} onPress={() => setShowConfirmPass(!showConfirmPass)}>
              <Feather name={showConfirmPass ? 'eye-off' : 'eye'} size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: colors.primary }, SHADOWS.sm]}
            onPress={handleRegister}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>Continue to Turf Setup</Text>
            <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 8 }} />
          </TouchableOpacity>
        </View>

        {/* Footer: Sign in link */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have a registered account?</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={[styles.loginBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.75}
          >
            <Text style={[styles.loginBtnText, { color: colors.primary }]}>Sign In</Text>
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
    paddingTop: 20,
    paddingBottom: 40,
  },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },

  header: {
    marginBottom: 22,
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: SIZES.xs,
    marginTop: 6,
    lineHeight: 18,
  },

  card: {
    borderRadius: SIZES.radiusLg,
    padding: 22,
    borderWidth: 1,
  },

  avatarSection: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 24,
    right: '38%',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarLabel: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    marginTop: 8,
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
  inputIcon: {
    paddingLeft: 14,
  },
  phonePrefix: {
    paddingLeft: 14,
    paddingRight: 6,
    justifyContent: 'center',
  },
  phonePrefixText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
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

  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
    marginTop: 26,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  footer: {
    alignItems: 'center',
    marginTop: 28,
  },
  footerText: {
    fontSize: SIZES.xs,
    fontWeight: '500',
    marginBottom: 10,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  loginBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '800',
  },
});

export default RegisterScreen;