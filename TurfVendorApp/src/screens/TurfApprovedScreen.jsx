// @theme-ready ✅
import React, { useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { acknowledgeTurfApproval } from '../redux/authSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// Drop an illustration in src/assets/turf-approved-illustration.png and
// it will be picked up automatically — falls back to a checkmark icon until then.[cite: 13]
let illustration = null;
try { illustration = require('../assets/turf-approved-illustration.png'); } catch (e) {}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
}

function vendorCode(vendorId) {
  if (!vendorId) return 'VND-0000';
  const digits = String(vendorId).replace(/\D/g, '');
  const last4 = (digits || String(vendorId)).slice(-4).padStart(4, '0');
  return `VND-${last4}`;
}

export default function TurfApprovedScreen({ navigation }) {
  const dispatch = useDispatch();
  const turfInfo = useSelector((s) => s.auth.turfInfo);
  const vendor = useSelector((s) => s.auth.vendor);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Hide default navigation header to remove white space above custom layout
  useLayoutEffect(() => {
    navigation?.setOptions?.({
      headerShown: false,
    });
  }, [navigation]);

  const handleContinue = () => {
    // Flips turfApprovalAcknowledged -> true, RootNavigator then swaps to the Main stack.
    dispatch(acknowledgeTurfApproval());
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.illustrationWrap}>
          {illustration ? (
            <Image source={illustration} style={styles.illustration} resizeMode="contain" />
          ) : (
            <View style={styles.successIconCircle}>
              <Feather name="check-circle" size={56} color={colors.success || colors.primary} />
            </View>
          )}
        </View>

        <Text style={styles.title}>Turf Approved</Text>
        <Text style={styles.subtitle}>
          Congratulations! Your turf has been approved and is ready for activation.
        </Text>

        <View style={styles.pill}>
          <Text style={styles.pillText}>APPROVED BY ADMIN</Text>
        </View>

        <View style={[styles.card, SHADOWS.sm]}>
          <View style={styles.cardTopRow}>
            <Text style={styles.turfName}>{turfInfo?.name || vendor?.businessName || 'Your Turf'}</Text>
            <View style={styles.codeBadge}>
              <Text style={styles.codeBadgeText}>● {vendorCode(vendor?._id)}</Text>
            </View>
          </View>
          <View style={styles.verifiedRow}>
            <Feather name="check-circle" size={14} color={colors.success || colors.primary} />
            <Text style={styles.verifiedText}>Verified</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.rowLabel}>Approval Date</Text>
          <Text style={styles.rowValue}>{formatDate(turfInfo?.reviewedAt)}</Text>

          <Text style={[styles.rowLabel, { marginTop: 12 }]}>Admin Review Status</Text>
          <Text style={[styles.rowValue, { color: colors.success || colors.primary }]}>Completed</Text>
        </View>

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueText}>Continue</Text>
          <Feather name="arrow-right" size={18} color={colors.onAccent} style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const getStyles = (colors) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flex: 1, paddingHorizontal: SIZES.paddingLg, paddingTop: 32, justifyContent: 'center' },
  illustrationWrap: { alignItems: 'center', justifyContent: 'center', height: 160, marginBottom: 12 },
  illustration: { width: 220, height: 180 },
  successIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: (colors.success || colors.primary) + '15',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: (colors.success || colors.primary) + '30',
  },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', marginBottom: 20, paddingHorizontal: 8, lineHeight: 20 },
  pill: {
    alignSelf: 'center', backgroundColor: colors.primary + '15', borderRadius: 20,
    paddingHorizontal: 16, paddingVertical: 6, marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  pillText: { color: colors.primary, fontWeight: '800', fontSize: 11, letterSpacing: 0.8 },
  card: {
    borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radiusLg,
    padding: 20, marginBottom: 28,
    backgroundColor: colors.card || colors.background,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  turfName: { fontSize: 18, fontWeight: '800', color: colors.text, flexShrink: 1 },
  codeBadge: { backgroundColor: colors.primary + '15', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  codeBadgeText: { color: colors.primary, fontSize: 11, fontWeight: '800' },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  verifiedText: { color: colors.success || colors.primary, fontSize: 13, fontWeight: '700' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 16 },
  rowLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '600' },
  rowValue: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 4 },
  continueBtn: { 
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radiusLg, 
    paddingVertical: 16, 
    alignItems: 'center' 
  },
  continueText: { color: colors.onAccent, fontWeight: '800', fontSize: 16 },
});