// @theme-ready ✅
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform,
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
import Ionicons from 'react-native-vector-icons/Ionicons';

const ISSUE_CATEGORIES = [
  { key: 'Payment Issue', label: 'Payment & Payout', icon: 'credit-card' },
  { key: 'Booking Issue', label: 'Booking Dispute', icon: 'calendar' },
  { key: 'Technical Issue', label: 'Technical Bug', icon: 'tool' },
  { key: 'Turf Listing Issue', label: 'Turf Profile', icon: 'map-pin' },
  { key: 'Subscription Issue', label: 'Subscription Plan', icon: 'zap' },
  { key: 'Other', label: 'Other Inquiry', icon: 'help-circle' },
];

const ReportIssuesScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    reportSubmitting,
    reportSubmitted,
    reportError,
  } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState('Payment Issue');
  const [description, setDescription] = useState('');
  const [bookingRef, setBookingRef] = useState('');
  const [focusedField, setFocusedField] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchIssueTypes());
    dispatch(clearReportSubmitted());
  }, []);

  useEffect(() => {
    if (reportError) {
      Alert.alert('Submission Error', reportError);
    }
  }, [reportError]);

  const handleSubmit = () => {
    if (!description.trim()) {
      Alert.alert('Details Required', 'Please provide a brief description of the issue you are experiencing.');
      return;
    }
    const finalDesc = bookingRef.trim()
      ? `[Ref: ${bookingRef.trim()}]\n${description.trim()}`
      : description.trim();

    dispatch(submitReport({ issueType: selectedCategory, description: finalDesc }));
  };

  const handleDone = () => {
    dispatch(clearReportSubmitted());
    setDescription('');
    setBookingRef('');
    navigation.goBack();
  };

  // ---- Success State Screen ------------------------------------------------
  if (reportSubmitted) {
    const reportId = reportSubmitted.reportId || `TKT-${Math.floor(100000 + Math.random() * 900000)}`;

    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Support Ticket</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.successContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.successIconCircle, { backgroundColor: 'rgba(0, 197, 102, 0.12)' }]}>
            <Ionicons name="checkmark-circle" size={72} color="#00C566" />
          </View>

          <Text style={[styles.successTitle, { color: colors.text }]}>Ticket Submitted!</Text>
          <Text style={[styles.successSubtitle, { color: colors.textSecondary }]}>
            Your report has been logged with our priority vendor support team.
          </Text>

          <View style={[styles.ticketBadgeCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <Text style={[styles.ticketLabel, { color: colors.textSecondary }]}>SUPPORT TICKET ID</Text>
            <Text style={[styles.ticketValue, { color: colors.primary }]}>{reportId}</Text>
            <View style={[styles.ticketDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.ticketCategory, { color: colors.text }]}>Category: {selectedCategory}</Text>
          </View>

          <Text style={[styles.successFooter, { color: colors.textSecondary }]}>
            We usually investigate partner reports within 2–4 hours. You'll receive updates via email and push notifications.
          </Text>

          <TouchableOpacity
            style={[styles.doneBtn, { backgroundColor: colors.primary }, SHADOWS.sm]}
            onPress={handleDone}
            activeOpacity={0.85}
          >
            <Text style={styles.doneBtnText}>Return to Profile</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ---- Form State Screen ---------------------------------------------------
  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.container}>
        {/* Navbar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Feather name="arrow-left" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.navTitle, { color: colors.text }]}>Report an Issue</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Hero Header Banner */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            <View style={[styles.supportIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Feather name="headphones" size={24} color={colors.primary} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={[styles.heroHeading, { color: colors.text }]}>Partner Support Desk</Text>
              <Text style={[styles.heroSubText, { color: colors.textSecondary }]}>
                Experiencing an issue with a booking, payment, or app feature? Let us know below.
              </Text>
            </View>
          </View>

          {/* Issue Category Grid */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Select Issue Category</Text>
          <View style={styles.categoriesGrid}>
            {ISSUE_CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.categoryCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isSelected && { borderColor: colors.primary, backgroundColor: colors.primaryLight },
                  ]}
                  onPress={() => setSelectedCategory(cat.key)}
                  activeOpacity={0.8}
                >
                  <Feather
                    name={cat.icon}
                    size={18}
                    color={isSelected ? colors.primary : colors.textSecondary}
                    style={{ marginBottom: 6 }}
                  />
                  <Text
                    style={[
                      styles.categoryLabel,
                      { color: isSelected ? colors.primary : colors.text },
                      isSelected && { fontWeight: '800' },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Form Card */}
          <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
            {/* Optional Booking ID Reference */}
            <Text style={[styles.inputLabel, { color: colors.text }]}>Booking / Transaction Ref (Optional)</Text>
            <View
              style={[
                styles.singleInputRow,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'ref' ? colors.primary : colors.border },
              ]}
            >
              <Feather name="hash" size={16} color={focusedField === 'ref' ? colors.primary : colors.textSecondary} />
              <TextInput
                style={[styles.singleInput, { color: colors.text }]}
                value={bookingRef}
                onFocus={() => setFocusedField('ref')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setBookingRef}
                placeholder="e.g. BK-2026-8491"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            {/* Description Textarea */}
            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Describe the Issue *</Text>
            <View
              style={[
                styles.textAreaWrap,
                { backgroundColor: colors.inputBg, borderColor: focusedField === 'desc' ? colors.primary : colors.border },
              ]}
            >
              <TextInput
                style={[styles.textArea, { color: colors.text }]}
                placeholder="Please describe what happened, steps to reproduce, or any relevant details..."
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={6}
                value={description}
                onFocus={() => setFocusedField('desc')}
                onBlur={() => setFocusedField(null)}
                onChangeText={setDescription}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.cancelBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
              activeOpacity={0.75}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.cancelBtnText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary }, reportSubmitting && { opacity: 0.75 }, SHADOWS.sm]}
              activeOpacity={0.85}
              onPress={handleSubmit}
              disabled={reportSubmitting}
            >
              {reportSubmitting ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Feather name="send" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.submitBtnText}>Submit Ticket</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 12,
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
  content: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },

  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusLg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  supportIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  heroTextWrap: {
    flex: 1,
  },
  heroHeading: {
    fontSize: SIZES.sm + 1,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubText: {
    fontSize: SIZES.xs,
    lineHeight: 16,
  },

  sectionHeading: {
    fontSize: SIZES.sm,
    fontWeight: '800',
    marginBottom: 12,
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  categoryCard: {
    width: '31.2%',
    borderRadius: SIZES.radius,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  categoryLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  formCard: {
    borderRadius: SIZES.radiusLg,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: SIZES.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  singleInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  singleInput: {
    flex: 1,
    fontSize: SIZES.sm,
    paddingVertical: 0,
  },
  textAreaWrap: {
    borderRadius: SIZES.radius,
    borderWidth: 1.5,
    padding: 12,
  },
  textArea: {
    fontSize: SIZES.sm,
    minHeight: 110,
    paddingTop: 0,
  },

  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  // Success state styles
  successContent: {
    paddingHorizontal: SIZES.padding,
    paddingTop: 30,
    alignItems: 'center',
  },
  successIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: {
    fontSize: SIZES.xl,
    fontWeight: '900',
    marginBottom: 8,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: SIZES.sm,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  ticketBadgeCard: {
    width: '100%',
    borderRadius: SIZES.radiusLg,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 20,
  },
  ticketLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  ticketValue: {
    fontSize: SIZES.xxl,
    fontWeight: '900',
    letterSpacing: 1,
  },
  ticketDivider: {
    width: '100%',
    height: 1,
    marginVertical: 12,
  },
  ticketCategory: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  successFooter: {
    fontSize: SIZES.xs,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  doneBtn: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: SIZES.radius,
    paddingVertical: 15,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: SIZES.sm,
    fontWeight: '800',
  },
});

export default ReportIssuesScreen;