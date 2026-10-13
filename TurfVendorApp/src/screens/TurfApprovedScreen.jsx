// @theme-ready ✅
import React, { useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { acknowledgeTurfApproval } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const approvalIllustration = require('../assets/turf-approved-illustration.png');

/**
 * Format vendor account approval timestamp to readable date & time (e.g., "6 Oct 2026, 4:17 PM").
 * Uses local device timezone for correct local time representation.
 * Returns "Not available" if the timestamp is missing or invalid.
 */
function formatApprovalDateTime(dateStr) {
  if (!dateStr) return 'Not available';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 'Not available';

  const day = d.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
}

export default function TurfApprovedScreen({ navigation }) {
  const dispatch = useDispatch();
  const vendor = useSelector((s) => s.auth.vendor);
  const turfInfo = useSelector((s) => s.auth.turfInfo);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors, isDark);

  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  const handleContinue = () => {
    // Flips turfApprovalAcknowledged -> true, RootNavigator then swaps to the Main stack.
    dispatch(acknowledgeTurfApproval());
  };

  const handleBack = () => {
    if (navigation?.canGoBack?.()) {
      navigation.goBack();
    } else {
      handleContinue();
    }
  };

  // Vendor account approval timestamp from Superadmin review
  const rawApprovalDate = vendor?.reviewedAt || turfInfo?.reviewedAt;
  const approvalDateTimeFormatted = formatApprovalDateTime(rawApprovalDate);

  // Status confirmed only if Superadmin approved the vendor account
  const isAccountApproved = vendor?.kycStatus === 'approved';

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={[styles.backBtn, SHADOWS.sm]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Turf Profile & Facilities</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <Image
            source={approvalIllustration}
            style={styles.illustration}
            resizeMode="contain"
          />
        </View>

        {/* Title & Subtitle */}
        <Text style={styles.title}>Turf Approved</Text>
        <Text style={styles.subtitle}>
          Congratulations! Your turf has been approved and is ready for activation.
        </Text>

        {/* Status Pill Badge */}
        <View style={styles.pill}>
          <Feather name="check-circle" size={13} color={colors.primary} style={{ marginRight: 6 }} />
          <Text style={styles.pillText}>APPROVED BY ADMIN</Text>
        </View>

        {/* Information Card (Vendor Account Approval Details) */}
        <View style={[styles.card, SHADOWS.sm]}>
          {/* Row 1: Approval Date & Time */}
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Feather name="calendar" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Approval Date</Text>
              <Text style={styles.rowValue}>{approvalDateTimeFormatted}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Row 2: Admin Review Status */}
          <View style={styles.cardRow}>
            <View style={styles.iconCircle}>
              <Feather name="check-circle" size={20} color={colors.primary} />
            </View>
            <View style={styles.rowContent}>
              <Text style={styles.rowLabel}>Admin Review Status</Text>
              <Text
                style={[
                  styles.rowValue,
                  { color: isAccountApproved ? colors.primary : colors.warning },
                ]}
              >
                {isAccountApproved ? 'Completed' : 'Under Review'}
              </Text>
            </View>
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueBtn, SHADOWS.sm]}
          onPress={handleContinue}
          activeOpacity={0.85}
        >
          <Text style={styles.continueText}>Continue</Text>
          <Feather name="arrow-right" size={18} color={colors.onAccent} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (colors, isDark) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  headerRightPlaceholder: {
    width: 40,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 220,
    marginVertical: 12,
  },
  illustration: {
    width: '100%',
    height: 210,
    maxWidth: 320,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
    lineHeight: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: isDark ? 'rgba(15, 118, 110, 0.2)' : '#E6F4F1',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 22,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(15, 118, 110, 0.4)' : '#B2DFDB',
  },
  pillText: {
    color: colors.primary,
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: 20,
    paddingVertical: 18,
    marginBottom: 28,
    backgroundColor: colors.card,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: isDark ? 'rgba(15, 118, 110, 0.2)' : '#E6F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
    marginBottom: 3,
  },
  rowValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: 16,
  },
  continueBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: SIZES.radiusLg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueText: {
    color: colors.onAccent,
    fontWeight: '800',
    fontSize: 16,
  },
});