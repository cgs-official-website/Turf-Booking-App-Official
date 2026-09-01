// src/screens/RegisterScreen.jsx
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { registerUser } from '../redux/authSlice';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import Icon from 'react-native-vector-icons/Ionicons';

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

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Missing info', 'Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure both passwords are the same');
      return;
    }

    const res = await dispatch(registerUser({ name: name.trim(), email: email.trim(), password }));
    if (registerUser.rejected.match(res)) {
      Alert.alert('Registration Failed', res.payload || 'Please try again');
      return;
    }
    // Automatically navigates into app via RootNavigator watching token
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>

        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join and start booking turfs in minutes</Text>

        <Text style={styles.label}>Full Name</Text>
        <View style={styles.inputWrap}>
          <Icon name="person-outline" size={18} color={COLORS.subtext} />
          <TextInput
            style={styles.input}
            placeholder="John Doe"
            placeholderTextColor={COLORS.subtext}
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputWrap}>
          <Icon name="mail-outline" size={18} color={COLORS.subtext} />
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={COLORS.subtext}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrap}>
          <Icon name="lock-closed-outline" size={18} color={COLORS.subtext} />
          <TextInput
            style={styles.input}
            placeholder="At least 6 characters"
            placeholderTextColor={COLORS.subtext}
            secureTextEntry={!showPass}
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity onPress={() => setShowPass(!showPass)}>
            <Icon name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Confirm Password</Text>
        <View style={styles.inputWrap}>
          <Icon name="lock-closed-outline" size={18} color={COLORS.subtext} />
          <TextInput
            style={styles.input}
            placeholder="Re-enter your password"
            placeholderTextColor={COLORS.subtext}
            secureTextEntry={!showConfirm}
            value={confirmPassword}
            onChangeText={setConfirm}
          />
          <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)}>
            <Icon name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.subtext} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Create Account</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login2')}>
            <Text style={styles.footerLink}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.xl, paddingTop: 56, flexGrow: 1 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.lg },
  title: { ...FONT.h1, color: COLORS.text },
  subtitle: { ...FONT.body, color: COLORS.subtext, marginTop: 6, marginBottom: SPACING.lg },
  label: { ...FONT.small, color: COLORS.text, fontWeight: '600', marginBottom: SPACING.xs, marginTop: SPACING.md },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, gap: SPACING.sm, backgroundColor: COLORS.bgSoft },
  input: { flex: 1, paddingVertical: 14, color: COLORS.text, fontSize: 15 },
  button: { backgroundColor: COLORS.primary, paddingVertical: SPACING.lg, borderRadius: RADIUS.lg, alignItems: 'center', marginTop: SPACING.xl },
  buttonText: { color: '#fff', ...FONT.button },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.xl, marginBottom: SPACING.xl },
  footerText: { color: COLORS.subtext },
  footerLink: { color: COLORS.primary, fontWeight: '700' },
});