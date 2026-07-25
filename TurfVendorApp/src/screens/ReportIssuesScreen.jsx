// @theme-ready ✅
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchIssueTypes,
  submitReport,
  clearReportSubmitted,
} from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// Optional illustration for the success state — same optional-asset pattern
// used in TermsScreen.jsx. Falls back to an icon if the asset isn't there.
let successImage = null;
try { successImage = require('../assets/report-success-illustration.png'); } catch (e) {}

const FALLBACK_ISSUE_TYPES = [
  'All issues',
  'Payment Issue',
  'Booking Issue',
  'Technical Issue',
  'Turf Listing Issue',
  'Subscription Issue',
  'Other',
];

const ReportIssuesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    issueTypes,
    reportSubmitting,
    reportSubmitted,
    reportError,
  } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [issueType, setIssueType] = useState('All issues');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [description, setDescription] = useState('');

  const options = issueTypes?.length ? issueTypes : FALLBACK_ISSUE_TYPES;

  // Hide default navigation header to remove white space above custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchIssueTypes());
    // Reset any previous submission so re-opening this screen starts fresh.
    dispatch(clearReportSubmitted());
  }, []);

  useEffect(() => {
    if (reportError) {
      Alert.alert('Could not submit', reportError);
    }
  }, [reportError]);

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Description required', 'Please describe the issue you are facing.');
      return;
    }
    dispatch(submitReport({ issueType, description: description.trim() }));
  };

  const handleCancel = () => navigation.goBack();

  const handleDone = () => {
    dispatch(clearReportSubmitted());
    setDescription('');
    setIssueType('All issues');
    navigation.goBack();
  };

  // ---- Success state -------------------------------------------------------
  if (reportSubmitted) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleDone} style={styles.backBtn} activeOpacity={0.7}>
            <Feather name="arrow-left" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Report</Text>
          <View style={{ width: 30 }} />
        </View>

        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={styles.illustrationWrap}>
            {successImage ? (
              <Image source={successImage} style={styles.illustration} resizeMode="contain" />
            ) : (
              <View style={styles.successIconCircle}>
                <Feather name="check" size={40} color={colors.onAccent} />
              </View>
            )}
          </View>

          <Text style={styles.successTitle}>Report Submitted</Text>
          <Text style={styles.successSubtitle}>We have received your issue</Text>

          <View style={styles.reportIdBox}>
            <Text style={styles.reportIdLabel}>Report ID</Text>
            <Text style={styles.reportIdValue}>{reportSubmitted.reportId}</Text>
          </View>

          <Text style={styles.successFooter}>
            Our team will review your issue and get back to you soon
          </Text>
        </ScrollView>
      </View>
    );
  }

  // ---- Form state ------------------------------------------------------------
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warnIconCircle}>
          <Feather name="alert-triangle" size={30} color={colors.success || colors.primary} />
        </View>

        <Text style={styles.title}>Report an Issue</Text>
        <Text style={styles.subtitle}>
          Let Us Know the Issue you are facing. Our team will get back to you
        </Text>

        <Text style={styles.label}>Issue type</Text>
        <TouchableOpacity
          style={styles.dropdown}
          activeOpacity={0.7}
          onPress={() => setDropdownOpen((v) => !v)}
        >
          <Text style={styles.dropdownText}>{issueType}</Text>
          <Feather name={dropdownOpen ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {dropdownOpen && (
          <View style={[styles.dropdownList, SHADOWS.sm]}>
            {options.map((opt) => (
              <TouchableOpacity
                key={opt}
                style={styles.dropdownItem}
                onPress={() => {
                  setIssueType(opt);
                  setDropdownOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    opt === issueType && styles.dropdownItemTextActive,
                  ]}
                >
                  {opt}
                </Text>
                {opt === issueType && <Feather name="check" size={18} color={colors.success || colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.label, { marginTop: 20 }]}>Description</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Here is your Comment"
          placeholderTextColor={colors.textSecondary}
          multiline
          numberOfLines={5}
          value={description}
          onChangeText={setDescription}
          textAlignVertical="top"
        />

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.8} onPress={handleCancel}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitBtn, reportSubmitting && { opacity: 0.7 }]}
            activeOpacity={0.8}
            onPress={handleSubmit}
            disabled={reportSubmitting}
          >
            {reportSubmitting ? (
              <ActivityIndicator color={colors.onAccent} />
            ) : (
              <Text style={styles.submitBtnText}>Submit</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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

  content: { paddingHorizontal: SIZES.padding, paddingBottom: 60, alignItems: 'stretch' },

  warnIconCircle: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 2, borderColor: colors.success || colors.primary,
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  title: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: SIZES.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: 24 },

  label: { fontSize: SIZES.base, fontWeight: '700', color: colors.text, marginBottom: 8 },

  dropdown: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius,
    paddingHorizontal: 14, paddingVertical: 14,
    backgroundColor: colors.inputBg || colors.card,
  },
  dropdownText: { fontSize: SIZES.base, color: colors.text },

  dropdownList: {
    backgroundColor: colors.card || colors.background, borderRadius: SIZES.radius,
    marginTop: 6, overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  dropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dropdownItemText: { fontSize: SIZES.base, color: colors.text },
  dropdownItemTextActive: { color: colors.success || colors.primary, fontWeight: '700' },

  textArea: {
    borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radius,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: SIZES.base,
    color: colors.text, minHeight: 120,
    backgroundColor: colors.inputBg || colors.card,
  },

  btnRow: { flexDirection: 'row', gap: 12, marginTop: 28 },
  cancelBtn: {
    flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: SIZES.radius,
    paddingVertical: 14, alignItems: 'center',
  },
  cancelBtnText: { fontSize: SIZES.base, fontWeight: '700', color: colors.text },
  submitBtn: {
    flex: 1, backgroundColor: colors.success || colors.primary, borderRadius: SIZES.radius,
    paddingVertical: 14, alignItems: 'center',
  },
  submitBtnText: { fontSize: SIZES.base, fontWeight: '700', color: colors.onAccent },

  // ---- success state ----
  successContent: { paddingHorizontal: SIZES.padding, paddingTop: 30, alignItems: 'center' },
  illustrationWrap: { marginBottom: 24 },
  illustration: { width: 220, height: 180 },
  successIconCircle: {
    width: 90, height: 90, borderRadius: 45, backgroundColor: colors.success || colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  successTitle: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text, marginBottom: 8 },
  successSubtitle: { fontSize: SIZES.base, color: colors.textSecondary, marginBottom: 24 },
  reportIdBox: {
    backgroundColor: colors.inputBg || colors.border, borderRadius: SIZES.radius,
    paddingVertical: 18, paddingHorizontal: 40, alignItems: 'center', marginBottom: 24,
    borderWidth: 1, borderColor: colors.border,
  },
  reportIdLabel: { fontSize: SIZES.base, color: colors.textSecondary, marginBottom: 4 },
  reportIdValue: { fontSize: SIZES.xl, fontWeight: '800', color: colors.success || colors.primary },
  successFooter: { fontSize: SIZES.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});

export default ReportIssuesScreen;