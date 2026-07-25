// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, Image, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import { updateVendorProfile } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const PersonalInformationScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { vendor } = useSelector((s) => s.auth);
  
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [name, setName] = useState(vendor?.name || '');
  const [email, setEmail] = useState(vendor?.email || '');
  const [contact, setContact] = useState(vendor?.contact || vendor?.phone || '');
  const [avatarUri, setAvatarUri] = useState(vendor?.avatar || null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Hide default navigation header to remove white space above the custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const pickImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      selectionLimit: 1,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      Alert.alert('Error', result.errorMessage || 'Could not open image picker.');
      return;
    }
    if (result.assets?.length) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = 'Name is required';
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email';
    if (!contact.trim()) next.contact = 'Contact number is required';
    else if (!/^\d{10}$/.test(contact.trim())) next.contact = 'Enter a valid 10-digit number';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = { name: name.trim(), email: email.trim(), contact: contact.trim() };
      // Only send avatar if it changed to a local file uri (needs upload)
      if (avatarUri && avatarUri.startsWith('file')) {
        payload.avatar = avatarUri;
      }
      await dispatch(updateVendorProfile(payload)).unwrap();
      Alert.alert('Success', 'Your profile has been updated.');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Update failed', typeof err === 'string' ? err : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Custom Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.avatarWrap}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarFallbackText}>{name?.[0]?.toUpperCase() || 'V'}</Text>
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Feather name="edit-2" size={13} color={colors.onAccent} />
              </View>
            </TouchableOpacity>
          </View>

          <Text style={styles.sectionTitle}>Personal information</Text>

          <View style={[styles.formCard, SHADOWS.sm]}>
            <Text style={styles.label}>Enter your name</Text>
            <View style={[styles.inputRow, errors.name && styles.inputRowError]}>
              <Feather name="user" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(t) => { setName(t); if (errors.name) setErrors((e) => ({ ...e, name: null })); }}
                placeholder="Your full name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}

            <Text style={[styles.label, { marginTop: 16 }]}>Email address</Text>
            <View style={[styles.inputRow, errors.email && styles.inputRowError]}>
              <Feather name="mail" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(t) => { setEmail(t); if (errors.email) setErrors((e) => ({ ...e, email: null })); }}
                placeholder="you@example.com"
                placeholderTextColor={colors.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

            <Text style={[styles.label, { marginTop: 16 }]}>Contact Number</Text>
            <View style={[styles.inputRow, errors.contact && styles.inputRowError]}>
              <Feather name="phone" size={18} color={colors.textSecondary} />
              <TextInput
                style={styles.input}
                value={contact}
                onChangeText={(t) => { setContact(t.replace(/[^0-9]/g, '')); if (errors.contact) setErrors((e) => ({ ...e, contact: null })); }}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.contact && <Text style={styles.errorText}>{errors.contact}</Text>}
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <>
                <Feather name="check" size={20} color={colors.onAccent} style={{ marginRight: 8 }} />
                <Text style={styles.saveBtnText}>Save Details</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding, paddingTop: 20, paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text },
  content: { paddingHorizontal: SIZES.padding, paddingBottom: 40, alignItems: 'center' },

  avatarWrap: { marginTop: 12, marginBottom: 24 },
  avatar: { width: 100, height: 100, borderRadius: 50 },
  avatarFallback: {
    width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarFallbackText: { color: colors.onAccent, fontSize: 34, fontWeight: '700' },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2, width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.card || colors.background,
  },

  sectionTitle: { alignSelf: 'flex-start', fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginBottom: 14 },

  formCard: { 
    width: '100%', 
    backgroundColor: colors.card || colors.background, 
    borderRadius: SIZES.radiusLg, 
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  label: { fontSize: SIZES.sm, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.inputBg || colors.border, 
    borderRadius: SIZES.radius,
    borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, height: 50,
  },
  inputRowError: { borderColor: colors.error },
  input: { flex: 1, fontSize: SIZES.base, color: colors.text },
  errorText: { color: colors.error, fontSize: SIZES.xs, marginTop: 6, fontWeight: '500' },

  saveBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%', backgroundColor: colors.primary, borderRadius: SIZES.radiusLg,
    paddingVertical: 16, alignItems: 'center', marginTop: 32,
  },
  saveBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: SIZES.base },
});

export default PersonalInformationScreen;