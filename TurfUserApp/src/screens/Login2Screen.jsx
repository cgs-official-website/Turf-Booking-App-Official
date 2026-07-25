// src/screens/Login2Screen.jsx
import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import { loginUser } from '../redux/authSlice';
import { SPACING, RADIUS } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/Ionicons';

const background = require('../assets/background.jpg');
const logo       = require('../assets/logo.png');

export default function Login2Screen({ navigation }) {
  const dispatch = useDispatch();
  const { C } = useTheme();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    const res = await dispatch(loginUser({ email: email.trim(), password }));
    setLoading(false);

    if (loginUser.rejected.match(res)) {
      // res.payload is the exact message thrown by the backend
      // (e.g. "Invalid email or password", "This account has been deactivated")
      Alert.alert('Login Failed', res.payload || 'Invalid email or password');
      return;
    }
    // res.payload.token is now set in the store — RootNavigator watches
    // `token` / `locationSet` and automatically switches to Location or Home.
    // No manual navigation call needed here.
  };

  return (
    <View style={styles.root}>
      <Image source={background} style={styles.bg} resizeMode="cover" />
      <View style={styles.overlay} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

          <View style={styles.logoWrap}>
            <View style={[styles.logoCircle, { backgroundColor: C.card }]}>
              <Image source={logo} style={styles.logo} resizeMode="contain" />
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: C.card }]}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: C.text }]}>Welcome Back</Text>
              <Icon name="hand-right-outline" size={20} color={C.text} style={styles.titleIcon} />
            </View>
            <Text style={[styles.subtitle, { color: C.subtext }]}>Sign in to continue</Text>

            <Text style={[styles.label, { color: C.text }]}>Email</Text>
            <View style={[styles.inputRow, { borderColor: C.border }]}>
              <Icon name="mail-outline" size={16} color={C.subtext} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Enter your email"
                placeholderTextColor={C.subtext}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={[styles.label, { color: C.text }]}>Password</Text>
            <View style={[styles.inputRow, { borderColor: C.border }]}>
              <Icon name="lock-closed-outline" size={16} color={C.subtext} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Enter your password"
                placeholderTextColor={C.subtext}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Icon name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.primaryBtnText}>Sign In →</Text>
              }
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.registerRow}>
              <Text style={[styles.registerText, { color: C.subtext }]}>
                Don't have an account?{' '}
                <Text style={{ color: C.primary, fontWeight: '700' }}>Register</Text>
              </Text>
            </TouchableOpacity>

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
  logoWrap:     { alignItems: 'center', marginBottom: -50, zIndex: 10 },
  logoCircle:   { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', elevation: 6 },
  logo:         { width: 90, height: 90 },
  card:         { borderRadius: RADIUS.xl, padding: SPACING.xl, paddingTop: 64 },
  titleRow:     { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 6 },
  title:        { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  titleIcon:    { marginTop: 2 },
  subtitle:     { fontSize: 13, textAlign: 'center', marginBottom: SPACING.xl },
  label:        { fontSize: 13, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  inputRow:     { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: RADIUS.lg, paddingHorizontal: SPACING.md, marginBottom: 4 },
  inputIcon:    { marginRight: 8 },
  input:        { flex: 1, paddingVertical: 14, fontSize: 15 },
  eyeBtn:       { padding: 6 },
  primaryBtn:   { paddingVertical: 16, borderRadius: RADIUS.lg, alignItems: 'center', marginTop: SPACING.xl, marginBottom: SPACING.md },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  registerRow:  { alignItems: 'center', marginTop: 8 },
  registerText: { fontSize: 13 },
});