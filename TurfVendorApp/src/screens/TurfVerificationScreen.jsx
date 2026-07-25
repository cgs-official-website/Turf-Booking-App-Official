// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator, Alert, SafeAreaView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import { submitTurfKyc } from '../redux/onboardingSlice';
import { markTurfOnboardingComplete } from '../redux/authSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';

export default function TurfVerificationScreen({ navigation }) {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const loading = useSelector((s) => s.onboarding.loading);

  const [gstFile, setGstFile] = useState(null);
  const [ebBillFile, setEbBillFile] = useState(null);
  const [digilockerVerified, setDigilockerVerified] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const pickFile = async (setter) => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.didCancel || !result.assets?.length) return;
    const asset = result.assets[0];
    setter({ uri: asset.uri, name: asset.fileName, type: asset.type });
  };

  const handleDigiLocker = () => {
    Alert.alert('DigiLocker', 'Connecting to DigiLocker...', [
      { text: 'OK', onPress: () => setDigilockerVerified(true) },
    ]);
  };

  const handleContinue = async () => {
    if (!digilockerVerified && (!gstFile || !ebBillFile)) {
      Alert.alert('Missing documents', 'Please upload GST Certificate and EB Bill, or verify with DigiLocker.');
      return;
    }
    const res = await dispatch(submitTurfKyc({ gstFile, ebBillFile, digilockerVerified }));
    if (submitTurfKyc.fulfilled.match(res)) {
      dispatch(markTurfOnboardingComplete());
      Alert.alert(
        'Submitted for review',
        'Your turf has been submitted to the admin for approval. You will be notified once verified.'
      );
    } else {
      Alert.alert('Error', res.payload || 'Something went wrong. Try again.');
    }
  };

  const UploadBox = ({ label, file, onPress }) => (
    <TouchableOpacity style={[styles.uploadBox, { borderColor: colors.border, backgroundColor: colors.card || colors.background }]} onPress={onPress} activeOpacity={0.7}>
      {file ? (
        <Image source={{ uri: file.uri }} style={styles.previewImg} />
      ) : (
        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#064E3B' : '#E9F9EF' }]}>
          <Feather name="file-text" size={20} color={colors.primary} />
        </View>
      )}
      <Text style={[styles.uploadLabel, { color: colors.text }]}>{label}</Text>
      <Text style={styles.uploadSub}>Tap to upload your {label}</Text>
      <View style={[styles.pendingBadge, { backgroundColor: colors.inputBg || colors.border }]}>
        <Text style={styles.pendingText}>{file ? 'Uploaded' : 'Pending Upload'}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turf Verification</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.stepLabel}>Step 3 out of 3</Text>

        <View style={styles.shieldWrap}>
          <View style={[styles.shield, SHADOWS.sm, { backgroundColor: colors.card || colors.background }]}>
            <Feather name="shield" size={26} color={colors.primary} />
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>Turf verification</Text>
        <Text style={styles.subtitle}>
          Verify your identity before registering your turf and receiving bookings.
        </Text>

        <View style={[styles.digiCard, { borderColor: colors.border, backgroundColor: isDark ? '#064E3B' : '#F3FBF6' }]}>
          <View style={styles.digiRow}>
            <View style={styles.digiIcon}><Feather name="book-open" size={18} color={colors.primary} /></View>
            <Text style={[styles.digiLabel, { color: colors.text }]}>Verify with DigiLocker</Text>
          </View>
          <Text style={[styles.digiDesc, { color: colors.textSecondary }]}>
            Quickly verify your Aadhaar and PAN using DigiLocker. Secure, instant, and hassle-free.
          </Text>
          <TouchableOpacity style={[styles.digiBtn, { backgroundColor: colors.primary }]} onPress={handleDigiLocker}>
            <Text style={[styles.digiBtnText, { color: colors.onAccent || '#fff' }]}>
              {digilockerVerified ? 'Connected ✓' : 'Connect DigiLocker'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.manualLabel, { color: colors.text }]}>Manual Upload</Text>

        <UploadBox label="Gst certificate" file={gstFile} onPress={() => pickFile(setGstFile)} />
        <View style={{ height: 14 }} />
        <UploadBox label="EB Bill" file={ebBillFile} onPress={() => pickFile(setEbBillFile)} />

        <TouchableOpacity
          style={[styles.continueBtn, loading && { opacity: 0.6 }, { backgroundColor: colors.primary }]}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color={colors.onAccent || '#fff'} /> : <Text style={[styles.continueText, { color: colors.onAccent || '#fff' }]}>Continue</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: colors.card || colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg || colors.border,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: colors.text,
  },
  container: { padding: 20, paddingBottom: 40 },
  stepLabel: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  shieldWrap: { alignItems: 'center', marginBottom: 16 },
  shield: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 13, color: colors.textSecondary, textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  digiCard: {
    borderWidth: 1,
    borderRadius: 14, padding: 16, marginBottom: 20,
  },
  digiRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  digiIcon: { marginRight: 8 },
  digiLabel: { fontWeight: '600' },
  digiDesc: { fontSize: 12, marginBottom: 14, lineHeight: 17 },
  digiBtn: { borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  digiBtnText: { fontWeight: '600' },
  manualLabel: { fontWeight: '600', marginBottom: 12 },
  uploadBox: {
    borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14,
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 12,
  },
  iconCircle: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  previewImg: { width: 60, height: 60, borderRadius: 8, marginBottom: 10 },
  uploadLabel: { fontWeight: '600', marginBottom: 4 },
  uploadSub: { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  pendingBadge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  pendingText: { fontSize: 11, color: colors.textSecondary },
  continueBtn: {
    marginTop: 28, borderRadius: 12, paddingVertical: 15, alignItems: 'center',
  },
  continueText: { fontWeight: '700', fontSize: 15 },
});