// @theme-ready ✅
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useIsFocused } from '@react-navigation/native';
import { registerVendor, clearError, clearRegistrationSuccess } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// Optional illustration — see src/assets/README.md. Falls back to a vector icon banner.
let tosImage = null;
try {
  tosImage = require('../assets/terms-illustration.png');
} catch (e) {
  tosImage = null;
}

const Section = ({ icon, title, children, colors, styles }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.iconBox}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    {children}
  </View>
);

const Bullet = ({ text, prohibited, colors, styles }) => (
  <View style={styles.bulletRow}>
    <Feather 
      name={prohibited ? 'x-circle' : 'chevron-right'} 
      size={16} 
      color={prohibited ? (colors.error || '#EF4444') : colors.primary} 
      style={styles.bulletIcon} 
    />
    <Text style={styles.bulletText}>{text}</Text>
  </View>
);

const TermsScreen = ({ navigation, route }) => {
  const dispatch = useDispatch();
  const { loading, error, registrationSuccess } = useSelector((s) => s.auth);
  const isFocused = useIsFocused();
  
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [agreed, setAgreed] = useState(false);

  // formData is passed in from RegisterScreen. If someone opens this screen
  // without registering (e.g. "View Terms" link), formData will be undefined
  // and the button just goes back.
  const formData = route?.params?.formData;

  // Hide default navigation header to remove white space above custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    if (error && isFocused) {
      Alert.alert('Registration Failed', error);
      dispatch(clearError());
    }
  }, [error, isFocused]);

  useEffect(() => {
    if (registrationSuccess) {
      dispatch(clearRegistrationSuccess());
      Alert.alert(
        'Registration Successful',
        'Your vendor account has been created. Please log in to proceed.',
        [{ text: 'OK', onPress: () => navigation.reset({ index: 0, routes: [{ name: 'Login' }] }) }]
      );
    }
  }, [registrationSuccess, navigation]);

  const handleContinue = () => {
    if (!agreed) {
      Alert.alert('Terms & Conditions', 'Please agree to the Terms & Conditions to continue.');
      return;
    }
    if (formData) {
      dispatch(registerVendor(formData));
    } else {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 30 }} />
      </View>

      {/* Fixed Header Banner */}
      <View style={styles.fixedHeader}>
        <View style={styles.illustrationWrap}>
          {tosImage ? (
            <Image source={tosImage} style={styles.illustration} resizeMode="contain" />
          ) : (
            <View style={styles.iconBanner}>
              <View style={styles.iconCircle}>
                <Feather name="shield" size={36} color={colors.primary} />
              </View>
              <View style={[styles.iconCircle, styles.iconCircleOffset]}>
                <Feather name="file-text" size={32} color={colors.success || colors.primary} />
              </View>
            </View>
          )}
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Section icon="shield" title="1. Usage Rights" colors={colors} styles={styles}>
          <Text style={styles.paragraph}>
            PitchPerfect grants you a limited, non-exclusive, non-transferable, and revocable
            license to use our platform strictly for booking sports turfs and managing your
            athletic activities. You agree not to exploit the service for commercial purposes
            without prior consent.
          </Text>
        </Section>

        <Section icon="user-check" title="2. User Responsibilities" colors={colors} styles={styles}>
          <Text style={styles.paragraph}>
            By creating an account, you represent that you are at least 13 years of age and
            will provide accurate information. You are solely responsible for:
          </Text>
          <Bullet text="Maintaining the confidentiality of your account credentials." colors={colors} styles={styles} />
          <Bullet text="All activities that occur under your user profile." colors={colors} styles={styles} />
          <Bullet text="Respecting the rules and regulations of the turf venues you book." colors={colors} styles={styles} />
        </Section>

        <View style={styles.prohibitedBox}>
          <View style={styles.prohibitedHeader}>
            <Feather name="alert-octagon" size={20} color={colors.error || '#EF4444'} style={{ marginRight: 8 }} />
            <Text style={styles.prohibitedTitle}>Prohibited Activities</Text>
          </View>
          <Text style={styles.paragraph}>
            To ensure a fair experience, the following are strictly prohibited:
          </Text>
          <Bullet prohibited text="Reselling booked slots to third parties." colors={colors} styles={styles} />
          <Bullet prohibited text="Using automated scripts to scrape booking data." colors={colors} styles={styles} />
          <Bullet prohibited text="Providing false identification or payment details." colors={colors} styles={styles} />
        </View>

        <Section icon="database" title="4. Data & Privacy" colors={colors} styles={styles}>
          <Text style={styles.paragraph}>
            Your use of the service is also governed by our Privacy Policy. We collect only
            the information required to operate bookings, payments and vendor support, and we
            never sell your personal data to third parties.
          </Text>
        </Section>

        <Section icon="lock" title="5. Termination" colors={colors} styles={styles}>
          <Text style={styles.paragraph}>
            We may suspend or terminate accounts that violate these terms. You may also close
            your account at any time from your profile settings.
          </Text>
        </Section>
      </ScrollView>

      <View style={[styles.footer, SHADOWS.md]}>
        {formData ? (
          <>
            <TouchableOpacity style={styles.checkboxRow} onPress={() => setAgreed(!agreed)} activeOpacity={0.7}>
              <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
                {agreed && <Feather name="check" size={14} color={colors.onAccent} />}
              </View>
              <Text style={styles.checkboxLabel}>I agree to the Terms & Conditions</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, (!agreed || loading) && { opacity: 0.6 }]}
              onPress={handleContinue}
              disabled={!agreed || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color={colors.onAccent} />
              ) : (
                <>
                  <Text style={styles.btnText}>Accept & Continue</Text>
                  <Feather name="arrow-right" size={18} color={colors.onAccent} style={{ marginLeft: 8 }} />
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            style={styles.btn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.85}
          >
            <Text style={styles.btnText}>Close</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text },
  
  fixedHeader: {
    paddingHorizontal: SIZES.paddingLg,
    paddingBottom: 12,
    backgroundColor: colors.background,
  },
  illustrationWrap: { alignItems: 'center', marginBottom: 8 },
  illustration: { width: '100%', height: 140 },
  iconBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 100,
    width: '100%',
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  iconCircleOffset: {
    marginLeft: -16,
    backgroundColor: (colors.success || colors.primary) + '15',
    borderColor: (colors.success || colors.primary) + '30',
  },
  
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: SIZES.paddingLg, paddingTop: 8, paddingBottom: 24 },
  section: { marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  sectionTitle: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text },
  paragraph: { fontSize: SIZES.sm + 1, color: colors.textSecondary, lineHeight: 22, marginBottom: 8 },
  
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 6, paddingRight: 4 },
  bulletIcon: { marginRight: 8, marginTop: 3 },
  bulletText: { flex: 1, fontSize: SIZES.sm + 1, color: colors.textSecondary, lineHeight: 20 },
  
  prohibitedBox: {
    backgroundColor: colors.error ? `${colors.error}15` : '#FEF2F2', 
    borderWidth: 1, 
    borderColor: colors.error ? `${colors.error}40` : '#FCA5A5',
    borderRadius: SIZES.radiusLg, 
    padding: 18, 
    marginBottom: 24,
  },
  prohibitedHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  prohibitedTitle: { fontSize: SIZES.lg, fontWeight: '800', color: colors.error || '#EF4444' },
  
  footer: {
    backgroundColor: colors.card || colors.background, 
    padding: SIZES.paddingLg,
    borderTopLeftRadius: SIZES.radiusLg, 
    borderTopRightRadius: SIZES.radiusLg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  checkbox: {
    width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: colors.border,
    marginRight: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.inputBg || colors.background,
  },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkboxLabel: { fontSize: SIZES.md, color: colors.text, flexShrink: 1, fontWeight: '600' },
  btn: { 
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius, 
    paddingVertical: 16, 
    alignItems: 'center',
  },
  btnText: { color: colors.onAccent, fontSize: SIZES.base, fontWeight: '800' },
});

export default TermsScreen;