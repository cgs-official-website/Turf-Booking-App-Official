import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import { registerUser } from '../redux/authSlice';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

export default function RegisterScreen({ navigation }) {
  const [name, setName]                 = useState('');
  const [email, setEmail]               = useState('');
  const [password, setPassword]         = useState('');
  const [confirmPassword, setConfirm]   = useState('');
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);

  const dispatch = useDispatch();
  const { status } = useSelector((s) => s.auth);
  const loading = status === 'loading';
  const { C, dark } = useTheme();

  const handleRegister = async () => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanName || !cleanEmail || !cleanPass || !confirmPassword.trim()) {
      Alert.alert('Missing Details', 'Please fill in your name, email, and password.');
      return;
    }
    if (cleanPass.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }
    if (cleanPass !== confirmPassword.trim()) {
      Alert.alert('Passwords Do Not Match', 'Please ensure both password fields are identical.');
      return;
    }

    try {
      const res = await dispatch(registerUser({
        name: cleanName,
        email: cleanEmail,
        password: cleanPass,
        role: 'user',
      }));

      if (registerUser.rejected.match(res)) {
        Alert.alert('Registration Failed', res.payload || 'An error occurred during registration. Please try again.');
        return;
      }

      // Successful registration will automatically navigate through RootNavigator!
    } catch (err) {
      Alert.alert('Network Error', err.message || 'Could not connect to the backend server.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: C.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>

        <Text style={[styles.title, { color: C.text }]}>Create Player Account</Text>
        <Text style={[styles.subtitle, { color: C.subtext }]}>
          Join thousands of players booking grounds across India
        </Text>

        {/* Input Fields */}
        <Text style={[styles.label, { color: C.text }]}>Full Name</Text>
        <View style={[styles.inputWrap, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="user" size={18} color={C.subtext} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: C.text }]}
            placeholder="e.g. Rahul Sharma"
            placeholderTextColor={C.caption}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
          />
        </View>

        <Text style={[styles.label, { color: C.text }]}>Email Address</Text>
        <View style={[styles.inputWrap, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="mail" size={18} color={C.subtext} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: C.text }]}
            placeholder="e.g. rahul@example.com"
            placeholderTextColor={C.caption}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Text style={[styles.label, { color: C.text }]}>Password</Text>
        <View style={[styles.inputWrap, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="lock" size={18} color={C.subtext} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: C.text }]}
            placeholder="At least 6 characters"
            placeholderTextColor={C.caption}
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={C.subtext} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.label, { color: C.text }]}>Confirm Password</Text>
        <View style={[styles.inputWrap, { backgroundColor: C.card, borderColor: C.border }]}>
          <Feather name="shield" size={18} color={C.subtext} style={styles.inputIcon} />
          <TextInput
            style={[styles.input, { color: C.text }]}
            placeholder="Re-enter your password"
            placeholderTextColor={C.caption}
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirm}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Feather name={showConfirm ? 'eye-off' : 'eye'} size={18} color={C.subtext} />
          </TouchableOpacity>
        </View>

        <PrimaryButton
          title="Create Account & Enter"
          onPress={handleRegister}
          loading={loading}
          style={{ marginTop: 24, marginBottom: 16 }}
        />

        <View style={styles.loginRow}>
          <Text style={[styles.loginText, { color: C.subtext }]}>
            Already have an account?{' '}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={[styles.loginLink, { color: C.primary }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content:   { padding: SPACING.xl, paddingTop: 56, paddingBottom: 40 },
  backBtn:   { width: 42, height: 42, borderRadius: 21, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  title:     { ...FONT.display, fontSize: 26, marginBottom: 6 },
  subtitle:  { ...FONT.body, fontSize: 13, marginBottom: 28 },
  label:     { ...FONT.caption, fontWeight: '700', marginBottom: 6, fontSize: 13 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 14, height: 52, marginBottom: 16 },
  inputIcon: { marginRight: 10 },
  input:     { flex: 1, ...FONT.body, fontSize: 15, fontWeight: '500' },
  loginRow:  { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  loginText: { fontSize: 13 },
  loginLink: { fontSize: 13, fontWeight: '800' },
});