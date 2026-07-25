// @theme-ready ✅
import React, { useLayoutEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { useSelector } from 'react-redux';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

const PREMIUM_FEATURES = [
  'Accept Customer Bookings',
  'Manage Turf Availability',
  'Create and Manage Tournaments',
  'Revenue & Analytics Insights',
  'Priority Vendor Support',
];

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const SummaryRow = ({ label, value, bold, styles }) => (
  <View style={styles.summaryRow}>
    <Text style={styles.summaryLabel}>{label}</Text>
    <Text style={[styles.summaryValue, bold && styles.summaryValueBold]}>{value}</Text>
  </View>
);

const TurfRow = ({ turf, styles, colors }) => (
  <View style={styles.turfRow}>
    {turf.image ? (
      <Image source={{ uri: turf.image }} style={styles.turfImg} />
    ) : (
      <View style={styles.turfImgFallback}>
        <Feather name="image" size={18} color={colors.textSecondary} />
      </View>
    )}
    <Text style={styles.turfName}>{turf.name}</Text>
    <View style={styles.activePill}>
      <Text style={styles.activePillText}>● ACTIVE</Text>
    </View>
  </View>
);

const SubscriptionDetailScreen = ({ navigation, route }) => {
  const invoice = route?.params?.invoice || {};
  const turfs = useSelector((s) => s.vendor?.turfs) || invoice.turfs || [];
  
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [downloading, setDownloading] = useState(false);

  const invoiceId = invoice.invoiceId || invoice._id || '—';
  const turfCount = turfs.length || invoice.turfCount || 1;
  const amount = invoice.subtotal ?? invoice.amount ?? 0;
  const gstAmount = invoice.gstAmount ?? Math.round(amount * 0.05);
  const total = invoice.total ?? amount + gstAmount;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const handleDownloadInvoice = () => {
    setDownloading(true);
    // Simulating instant success generation message or trigger browser invoice view
    setTimeout(() => {
      setDownloading(false);
      Alert.alert(
        'Invoice Ready',
        `Invoice ID: ${invoiceId}\nTotal Amount: ₹${total}.00\n\nYour subscription invoice has been successfully processed.`,
        [{ text: 'OK' }]
      );
    }, 600);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription details</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.successWrap}>
          <View style={styles.successCircle}>
            <Feather name="check" size={40} color={colors.onAccent} />
          </View>
          <Text style={styles.successTitle}>Subscription Activated{'\n'}Successfully !</Text>
          <Text style={styles.successSubtitle}>
            Your payment has been received and your{'\n'}vendor subscription is now active.
          </Text>
        </View>

        {turfs.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>Active Turfs</Text>
            <View style={[styles.card, SHADOWS.sm, { marginBottom: 24 }]}>
              {turfs.map((t, i) => (
                <View key={t._id || t.name} style={i < turfs.length - 1 ? styles.turfRowBorder : null}>
                  <TurfRow turf={t} styles={styles} colors={colors} />
                </View>
              ))}
            </View>
          </>
        )}

        <Text style={styles.sectionLabel}>Payment Summary</Text>
        <View style={[styles.card, SHADOWS.sm, { marginBottom: 24 }]}>
          <SummaryRow label="Invoice ID" value={invoiceId} styles={styles} />
          <SummaryRow label={`Turf (${turfCount})`} value={`₹${amount}.00`} styles={styles} />
          <SummaryRow label="Date" value={formatDate(invoice.date || invoice.createdAt)} styles={styles} />
          <SummaryRow label="GST Include (5%)" value={`₹${gstAmount}`} styles={styles} />
          <View style={styles.divider} />
          <SummaryRow label="Total Amount" value={`₹${total}.00`} bold styles={styles} />
        </View>

        <Text style={styles.sectionLabel}>Premium Features Unlocked</Text>
        <View style={[styles.card, SHADOWS.sm, { marginBottom: 20 }]}>
          {PREMIUM_FEATURES.map((f, i) => (
            <View key={f} style={[styles.featureRow, i === PREMIUM_FEATURES.length - 1 && { marginBottom: 0 }]}>
              <View style={styles.featureCheck}>
                <Feather name="check" size={12} color={colors.onAccent} />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        <View style={styles.trustRow}>
          <Feather name="shield" size={14} color={colors.textSecondary} style={{ marginRight: 6 }} />
          <Text style={styles.trustText}>Trusted by 10,000+ Premium Vendors</Text>
        </View>

        <TouchableOpacity
          style={styles.dashboardBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Main')}
        >
          <Text style={styles.dashboardBtnText}>Go To Dashboard</Text>
          <Feather name="arrow-right" size={18} color={colors.onAccent} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.downloadBtn} 
          activeOpacity={0.7} 
          onPress={handleDownloadInvoice}
          disabled={downloading}
        >
          <Feather name="file-text" size={16} color={colors.text} style={{ marginRight: 8 }} />
          <Text style={styles.downloadBtnText}>{downloading ? 'Processing...' : 'Download Invoice'}</Text>
        </TouchableOpacity>
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

  content: { paddingHorizontal: SIZES.padding, paddingBottom: 40 },

  successWrap: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  successCircle: {
    width: 84, height: 84, borderRadius: 42, backgroundColor: colors.success || colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  successTitle: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text, textAlign: 'center', marginBottom: 8 },
  successSubtitle: { fontSize: SIZES.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  sectionLabel: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginBottom: 10 },

  card: {
    backgroundColor: colors.card || colors.background,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },

  turfRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  turfRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  turfImg: { width: 40, height: 40, borderRadius: 8, marginRight: 12 },
  turfImgFallback: {
    width: 40, height: 40, borderRadius: 8, backgroundColor: colors.inputBg || colors.border,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
    borderWidth: 1, borderColor: colors.border,
  },
  turfName: { flex: 1, fontSize: SIZES.base, fontWeight: '600', color: colors.text },
  activePill: { backgroundColor: (colors.success || colors.primary) + '1A', borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  activePillText: { color: colors.success || colors.primary, fontSize: 10, fontWeight: '700' },

  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: { fontSize: SIZES.sm, color: colors.textSecondary },
  summaryValue: { fontSize: SIZES.sm, fontWeight: '600', color: colors.text },
  summaryValueBold: { fontSize: SIZES.lg, fontWeight: '800', color: colors.success || colors.primary },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 8 },

  featureRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  featureCheck: {
    width: 20, height: 20, borderRadius: 10, backgroundColor: colors.success || colors.primary,
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  featureText: { fontSize: SIZES.sm, fontWeight: '600', color: colors.text },

  trustRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  trustText: { fontSize: SIZES.xs, color: colors.textSecondary, fontWeight: '500' },

  dashboardBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.success || colors.primary, borderRadius: SIZES.radiusLg, paddingVertical: 16, marginBottom: 12,
  },
  dashboardBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: SIZES.base },

  downloadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border, borderRadius: SIZES.radiusLg, paddingVertical: 14,
    backgroundColor: colors.inputBg || 'transparent',
  },
  downloadBtnText: { color: colors.text, fontWeight: '700', fontSize: SIZES.base },
});

export default SubscriptionDetailScreen;