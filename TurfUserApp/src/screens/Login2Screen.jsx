import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useDispatch } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import { loginUser } from '../redux/authSlice';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

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
      Alert.alert('Error', 'Please enter your email and password');
      return;
    }
    setLoading(true);
    const res = await dispatch(loginUser({ email: email.trim(), password }));
    setLoading(false);

    if (loginUser.rejected.match(res)) {
      Alert.alert('Login Failed', res.payload || 'Invalid email or password');
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
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: C.text }]}>Welcome Back</Text>
              <Feather name="smile" size={20} color={C.primary} style={{ marginLeft: 6 }} />
            </View>
            <Text style={[styles.subtitle, { color: C.subtext }]}>
              Sign in with your registered email address
            </Text>

            <Text style={[styles.label, { color: C.text }]}>Email</Text>
            <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.bgSoft }]}>
              <Feather name="mail" size={18} color={C.subtext} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Enter your email"
                placeholderTextColor={C.caption}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
            </View>

            <Text style={[styles.label, { color: C.text }]}>Password</Text>
            <View style={[styles.inputRow, { borderColor: C.border, backgroundColor: C.bgSoft }]}>
              <Feather name="lock" size={18} color={C.subtext} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: C.text }]}
                placeholder="Enter your password"
                placeholderTextColor={C.caption}
                secureTextEntry={!showPass}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={C.subtext} />
              </TouchableOpacity>
            </View>

            <PrimaryButton
              title="Sign In →"
              onPress={handleLogin}
              loading={loading}
              style={{ marginTop: 8, marginBottom: 16 }}
            />

            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: C.subtext }]}>
                Don't have an account?{' '}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={[styles.footerLink, { color: C.primary }]}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:        { flex: 1 },
  bg:          { position: 'absolute', width: '100%', height: '100%' },
  overlay:     { position: 'absolute', width: '100%', height: '100%' },
  kav:         { flex: 1 },
  scroll:      { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: SPACING.lg, paddingBottom: 32 },
  backBtn:     { position: 'absolute', top: 54, left: SPACING.lg, zIndex: 10, width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  logoWrap:    { alignItems: 'center', marginBottom: -48, zIndex: 10 },
  logoCircle:  { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  logo:        { width: 75, height: 75 },
  card:        { borderRadius: RADIUS.xxl, padding: SPACING.xl, paddingTop: 60 },
  titleRow:    { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginBottom: 4 },
  title:       { ...FONT.h1, fontSize: 22 },
  subtitle:    { ...FONT.body, fontSize: 13, textAlign: 'center', marginBottom: SPACING.xl },
  label:       { ...FONT.caption, fontWeight: '700', marginBottom: 6 },
  inputRow:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: RADIUS.lg, paddingHorizontal: 14, height: 52, marginBottom: 14 },
  inputIcon:   { marginRight: 10 },
  input:       { flex: 1, ...FONT.body, fontSize: 15, fontWeight: '500' },
  eyeBtn:      { padding: 4 },
  footerRow:   { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  footerText:  { fontSize: 13 },
  footerLink:  { fontSize: 13, fontWeight: '800' },
});