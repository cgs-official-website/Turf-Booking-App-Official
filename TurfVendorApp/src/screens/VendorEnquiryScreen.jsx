// @theme-ready ✅
import React, { useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { submitVendorEnquiryApi } from '../api';

const initialForm = {
  turfName: '',
  vendorName: '',
  vendorMobile: '',
  vendorLocation: '',
  message: '',
};

const VendorEnquiryScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [focusedField, setFocusedField] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: null }));
    }
    if (serverError) {
      setServerError(null);
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!form.turfName.trim()) {
      newErrors.turfName = 'Turf Name is required';
    }

    if (!form.vendorName.trim()) {
      newErrors.vendorName = 'Vendor Name is required';
    }

    const cleanPhone = form.vendorMobile.replace(/\D/g, '');
    if (!cleanPhone) {
      newErrors.vendorMobile = 'Vendor Mobile is required';
    } else if (cleanPhone.length !== 10) {
      newErrors.vendorMobile = 'Please enter a valid 10-digit mobile number';
    }

    if (!form.vendorLocation.trim()) {
      newErrors.vendorLocation = 'Vendor Location is required';
    }

    if (!form.message.trim()) {
      newErrors.message = 'Message is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendEnquiry = async () => {
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    setServerError(null);

    try {
      await submitVendorEnquiryApi({
        turfName: form.turfName.trim(),
        vendorName: form.vendorName.trim(),
        vendorMobile: form.vendorMobile.replace(/\D/g, ''),
        vendorLocation: form.vendorLocation.trim(),
        message: form.message.trim(),
      });

      Alert.alert(
        'Enquiry Sent Successfully',
        'Thank you! Your enquiry has been received. Our team will contact you shortly.',
        [
          {
            text: 'OK',
            onPress: () => {
              setForm(initialForm);
              setErrors({});
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            },
          },
        ]
      );
    } catch (err) {
      const errorMsg =
        err?.message || 'Failed to submit enquiry. Please check your connection and try again.';
      setServerError(errorMsg);
      Alert.alert('Submission Error', errorMsg);
    } finally {
      setSubmitting(false);
    }
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
        {/* Top Glow Accent */}
        <View style={[styles.topGlow, { backgroundColor: colors.primaryLight }]} />

        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Vendor Enquiry</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Header Title */}
        <View style={styles.header}>
          <View
            style={[
              styles.iconBadge,
              { backgroundColor: colors.card, borderColor: colors.border },
              SHADOWS.sm,
            ]}
          >
            <View style={[styles.iconInner, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="chatbubbles-outline" size={26} color={colors.primary} />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Partner with Us</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Interested in listing your turf facility? Fill out the details below and our team will get in touch with you.
          </Text>
        </View>

        {/* Server Error Banner */}
        {serverError && (
          <View style={[styles.errorBanner, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: colors.error }]}>
            <Feather name="alert-circle" size={16} color={colors.error} style={{ marginRight: 8 }} />
            <Text style={[styles.errorBannerText, { color: colors.error }]}>{serverError}</Text>
          </View>
        )}

        {/* Form Container */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
          {/* Turf Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Turf Name <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.turfName
                    ? colors.error
                    : focusedField === 'turfName'
                    ? colors.primary
                    : colors.border,
                },
                focusedField === 'turfName' && styles.inputContainerFocused,
              ]}
            >
              <Ionicons
                name="football-outline"
                size={18}
                color={
                  errors.turfName
                    ? colors.error
                    : focusedField === 'turfName'
                    ? colors.primary
                    : colors.textSecondary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Green Arena Sports Club"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                value={form.turfName}
                onFocus={() => setFocusedField('turfName')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(v) => updateField('turfName', v)}
              />
              {form.turfName.length > 0 && (
                <TouchableOpacity onPress={() => updateField('turfName', '')} style={styles.clearBtn}>
                  <Feather name="x-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {errors.turfName ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.turfName}</Text>
            ) : null}
          </View>

          {/* Vendor Name */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Vendor Name <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.vendorName
                    ? colors.error
                    : focusedField === 'vendorName'
                    ? colors.primary
                    : colors.border,
                },
                focusedField === 'vendorName' && styles.inputContainerFocused,
              ]}
            >
              <Feather
                name="user"
                size={18}
                color={
                  errors.vendorName
                    ? colors.error
                    : focusedField === 'vendorName'
                    ? colors.primary
                    : colors.textSecondary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
                value={form.vendorName}
                onFocus={() => setFocusedField('vendorName')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(v) => updateField('vendorName', v)}
              />
              {form.vendorName.length > 0 && (
                <TouchableOpacity onPress={() => updateField('vendorName', '')} style={styles.clearBtn}>
                  <Feather name="x-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {errors.vendorName ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.vendorName}</Text>
            ) : null}
          </View>

          {/* Vendor Mobile */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Vendor Mobile <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.vendorMobile
                    ? colors.error
                    : focusedField === 'vendorMobile'
                    ? colors.primary
                    : colors.border,
                },
                focusedField === 'vendorMobile' && styles.inputContainerFocused,
              ]}
            >
              <Feather
                name="phone"
                size={18}
                color={
                  errors.vendorMobile
                    ? colors.error
                    : focusedField === 'vendorMobile'
                    ? colors.primary
                    : colors.textSecondary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="10-digit mobile number"
                placeholderTextColor={colors.textSecondary}
                keyboardType="numeric"
                maxLength={10}
                value={form.vendorMobile}
                onFocus={() => setFocusedField('vendorMobile')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(v) => updateField('vendorMobile', v.replace(/\D/g, ''))}
              />
              {form.vendorMobile.length > 0 && (
                <TouchableOpacity onPress={() => updateField('vendorMobile', '')} style={styles.clearBtn}>
                  <Feather name="x-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {errors.vendorMobile ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.vendorMobile}</Text>
            ) : null}
          </View>

          {/* Vendor Location */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Vendor Location <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.vendorLocation
                    ? colors.error
                    : focusedField === 'vendorLocation'
                    ? colors.primary
                    : colors.border,
                },
                focusedField === 'vendorLocation' && styles.inputContainerFocused,
              ]}
            >
              <Feather
                name="map-pin"
                size={18}
                color={
                  errors.vendorLocation
                    ? colors.error
                    : focusedField === 'vendorLocation'
                    ? colors.primary
                    : colors.textSecondary
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={[styles.input, { color: colors.text }]}
                placeholder="e.g. Indiranagar, Bengaluru"
                placeholderTextColor={colors.textSecondary}
                value={form.vendorLocation}
                onFocus={() => setFocusedField('vendorLocation')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(v) => updateField('vendorLocation', v)}
              />
              {form.vendorLocation.length > 0 && (
                <TouchableOpacity onPress={() => updateField('vendorLocation', '')} style={styles.clearBtn}>
                  <Feather name="x-circle" size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {errors.vendorLocation ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.vendorLocation}</Text>
            ) : null}
          </View>

          {/* Message (Multiline) */}
          <View style={styles.fieldGroup}>
            <Text style={[styles.label, { color: colors.text }]}>
              Message <Text style={{ color: colors.error }}>*</Text>
            </Text>
            <View
              style={[
                styles.inputContainer,
                styles.multilineContainer,
                {
                  backgroundColor: colors.inputBg,
                  borderColor: errors.message
                    ? colors.error
                    : focusedField === 'message'
                    ? colors.primary
                    : colors.border,
                },
                focusedField === 'message' && styles.inputContainerFocused,
              ]}
            >
              <Feather
                name="message-circle"
                size={18}
                color={
                  errors.message
                    ? colors.error
                    : focusedField === 'message'
                    ? colors.primary
                    : colors.textSecondary
                }
                style={[styles.inputIcon, styles.multilineIcon]}
              />
              <TextInput
                style={[styles.input, styles.multilineInput, { color: colors.text }]}
                placeholder="Tell us about your turf facility, sports offered, slots or requirements..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
                value={form.message}
                onFocus={() => setFocusedField('message')}
                onBlur={() => setFocusedField(null)}
                onChangeText={(v) => updateField('message', v)}
              />
            </View>
            {errors.message ? (
              <Text style={[styles.errorText, { color: colors.error }]}>{errors.message}</Text>
            ) : null}
          </View>

          {/* Submit CTA Button */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              { backgroundColor: colors.primary },
              submitting && { opacity: 0.75 },
              SHADOWS.sm,
            ]}
            onPress={handleSendEnquiry}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Send Enquiry</Text>
                <Feather name="send" size={17} color="#FFFFFF" style={{ marginLeft: 8 }} />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Footer: Back to Login */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            Already have an active vendor account?
          </Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={[styles.loginBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            activeOpacity={0.75}
          >
            <Feather name="log-in" size={15} color={colors.primary} style={{ marginRight: 6 }} />
            <Text style={[styles.loginBtnText, { color: colors.primary }]}>Back to Sign In</Text>
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

  topGlow: {
    position: 'absolute',
    top: -100,
    left: '25%',
    width: 200,
    height: 200,
    borderRadius: 100,
    opacity: 0.35,
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
    alignItems: 'center',
    marginBottom: 24,
  },
  iconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginBottom: 14,
  },
  iconInner: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: SIZES.xs,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
    paddingHorizontal: 12,
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SIZES.radius,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorBannerText: {
    fontSize: SIZES.xs,
    flex: 1,
    fontWeight: '600',
  },

  card: {
    borderRadius: SIZES.radiusLg,
    padding: 20,
    borderWidth: 1,
  },

  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
  },
  inputContainerFocused: {
    borderWidth: 1.5,
  },
  multilineContainer: {
    alignItems: 'flex-start',
    minHeight: 105,
    paddingVertical: 8,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  multilineIcon: {
    paddingTop: 6,
  },
  input: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 12,
    fontSize: SIZES.sm,
  },
  multilineInput: {
    minHeight: 85,
    textAlignVertical: 'top',
    paddingTop: 4,
  },
  clearBtn: {
    padding: 10,
  },
  errorText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 4,
  },

  submitBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    marginTop: 10,
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
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  loginBtnText: {
    fontSize: SIZES.xs,
    fontWeight: '800',
  },
});

export default VendorEnquiryScreen;
