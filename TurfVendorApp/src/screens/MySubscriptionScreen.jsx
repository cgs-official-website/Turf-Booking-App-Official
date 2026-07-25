// @theme-ready ✅
import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMySubscription, fetchSubscriptionHistory } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// ---- helpers ----------------------------------------------------------------

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

// ---- small building blocks ---------------------------------------------------

const HistoryCard = ({ invoice, onViewInvoice, styles, colors }) => {
  const planName = invoice.plan?.name || 'Plan';
  const duration = invoice.plan?.durationLabel || invoice.plan?.duration || '12 Months';
  const nextRenewal = invoice.renewalDate || invoice.expiryDate || invoice.nextRenewal;
  const amount = invoice.amount ?? invoice.plan?.price;

  return (
    <View style={[styles.card, SHADOWS.sm]}>
      <View style={styles.cardTopRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Feather name="award" size={20} color={colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.planName}>{planName}</Text>
        </View>
        <TouchableOpacity onPress={() => onViewInvoice(invoice)} activeOpacity={0.7} style={styles.viewInvoiceBtn}>
          <Text style={styles.viewInvoiceLink}>View invoice</Text>
          <Feather name="chevron-right" size={16} color={colors.success || colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      <View style={styles.row}>
        <Text style={styles.rowLabel}>Duration</Text>
        <Text style={styles.rowValue}>{duration}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.rowLabel}>Next Renewal</Text>
        <Text style={styles.rowValue}>{formatDate(nextRenewal)}</Text>
      </View>
      <View style={[styles.row, { marginBottom: 0 }]}>
        <Text style={styles.rowLabel}>Billed amount</Text>
        <Text style={styles.rowAmount}>₹ {amount}</Text>
      </View>
    </View>
  );
};

// ---- screen -------------------------------------------------------------------

const MySubscriptionScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { mySubscription, subscriptionHistory, loading } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  // Hide default navigation header to remove white space above custom header
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchMySubscription());
    dispatch(fetchSubscriptionHistory());
  }, []);

  const handleViewInvoice = (invoice) => {
    navigation.navigate('SubscriptionDetail', { invoice });
  };

  if (loading && !subscriptionHistory?.length) {
    return <ActivityIndicator color={colors.primary} style={{ flex: 1, marginTop: 40, backgroundColor: colors.background }} />;
  }

  return (
    <View style={styles.container}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription history</Text>
        <View style={{ width: 30 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {subscriptionHistory?.length > 0 ? (
          subscriptionHistory.map((inv) => (
            <HistoryCard key={inv._id} invoice={inv} onViewInvoice={handleViewInvoice} styles={styles} colors={colors} />
          ))
        ) : mySubscription ? (
          <HistoryCard invoice={mySubscription} onViewInvoice={handleViewInvoice} styles={styles} colors={colors} />
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.iconContainer}>
              <Feather name="unlock" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Subscription History</Text>
            <Text style={styles.emptySubtitle}>Your past and current plans will show up here</Text>
            <TouchableOpacity style={styles.subscribeBtn} onPress={() => navigation.navigate('SubscriptionPlans')}>
              <Feather name="layers" size={18} color={colors.onAccent} style={{ marginRight: 8 }} />
              <Text style={styles.subscribeBtnText}>View Plans</Text>
            </TouchableOpacity>
          </View>
        )}
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

  card: {
    backgroundColor: colors.card || colors.background,
    borderRadius: SIZES.radiusLg,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  planName: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text },
  viewInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewInvoiceLink: { fontSize: SIZES.sm, fontWeight: '600', color: colors.success || colors.primary, marginRight: 2 },

  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: 14,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rowLabel: { fontSize: SIZES.sm, color: colors.textSecondary },
  rowValue: { fontSize: SIZES.sm, fontWeight: '700', color: colors.text },
  rowAmount: { fontSize: SIZES.lg, fontWeight: '800', color: colors.success || colors.primary },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  iconContainer: {
    backgroundColor: colors.primary + '15',
    padding: 24,
    borderRadius: 60,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyTitle: { fontSize: SIZES.xl, fontWeight: '700', color: colors.text, marginBottom: 8 },
  emptySubtitle: { fontSize: SIZES.sm, color: colors.textSecondary, textAlign: 'center', marginBottom: 28 },
  subscribeBtn: { 
    flexDirection: 'row',
    backgroundColor: colors.primary, 
    borderRadius: SIZES.radius, 
    paddingHorizontal: 32, 
    paddingVertical: 14,
    alignItems: 'center',
  },
  subscribeBtnText: { color: colors.onAccent, fontWeight: '700', fontSize: SIZES.base },
});

export default MySubscriptionScreen;