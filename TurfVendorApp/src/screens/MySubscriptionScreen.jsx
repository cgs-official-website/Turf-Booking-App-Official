// @theme-ready ✅
import React, { useEffect, useLayoutEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchMySubscription, fetchSubscriptionHistory, fetchVendorPayments } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

const HistoryCard = ({ invoice, onViewInvoice, colors }) => {
  const planName = invoice.plan?.name || invoice.name || 'Vendor Pro Membership';
  const duration = invoice.plan?.durationLabel || invoice.duration || 'Monthly Plan';
  const nextRenewal = invoice.renewalDate || invoice.expiryDate || invoice.nextRenewal;
  const amount = invoice.amount ?? invoice.plan?.price ?? '999';
  const status = invoice.status || 'PAID';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
      {/* Top Header Row */}
      <View style={styles.cardTopRow}>
        <View style={styles.planTitleBox}>
          <View style={[styles.awardBadge, { backgroundColor: colors.primaryLight }]}>
            <Feather name="zap" size={16} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.planName, { color: colors.text }]}>{planName}</Text>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>{duration}</Text>
          </View>
        </View>

        <View style={styles.statusPill}>
          <Text style={styles.statusPillText}>{status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Invoice Details Grid */}
      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>RENEWAL DATE</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(nextRenewal)}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>BILLED AMOUNT</Text>
          <Text style={[styles.detailAmount, { color: colors.primary }]}>₹{amount}</Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <TouchableOpacity
        style={[styles.viewReceiptBtn, { backgroundColor: colors.inputBg }]}
        onPress={() => onViewInvoice(invoice)}
        activeOpacity={0.75}
      >
        <Text style={[styles.viewReceiptText, { color: colors.primary }]}>View Tax Invoice & Receipt</Text>
        <Feather name="arrow-up-right" size={15} color={colors.primary} />
      </TouchableOpacity>
    </View>
  );
};

const PaymentTransactionCard = ({ payment, colors }) => {
  const isCaptured = payment.status === 'captured' || payment.status === 'success' || payment.status === 'paid' || payment.status === 'completed';
  const statusColor = isCaptured ? '#0F766E' : payment.status === 'failed' ? '#EF4444' : '#F59E0B';

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 10 }, SHADOWS.sm]}>
      <View style={styles.cardTopRow}>
        <View style={styles.planTitleBox}>
          <View style={[styles.awardBadge, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
            <Feather name="dollar-sign" size={16} color="#3B82F6" />
          </View>
          <View>
            <Text style={[styles.planName, { color: colors.text }]}>{payment.turfName || 'Booking Settlement'}</Text>
            <Text style={[styles.durationLabel, { color: colors.textSecondary }]}>
              {payment.purpose ? payment.purpose.replace('_', ' ').toUpperCase() : 'BOOKING PAYMENT'}
            </Text>
          </View>
        </View>

        <View style={[styles.statusPill, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusPillText, { color: statusColor }]}>
            {(payment.status || 'SUCCESS').toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.detailsRow}>
        <View style={styles.detailCol}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>DATE & TIME</Text>
          <Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(payment.createdAt)}</Text>
        </View>
        <View style={styles.detailCol}>
          <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>TRANSACTION AMOUNT</Text>
          <Text style={[styles.detailAmount, { color: colors.primary }]}>₹{payment.amount}</Text>
        </View>
      </View>

      {payment.razorpayPaymentId ? (
        <View style={{ marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
          <Text style={{ fontSize: 10, color: colors.textSecondary }}>
            Razorpay Ref: {payment.razorpayPaymentId}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const MySubscriptionScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { mySubscription, subscriptionHistory, payments, paymentsLoading, loading } = useSelector((s) => s.vendor);
  const { colors, isDark } = useTheme();

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchMySubscription());
    dispatch(fetchSubscriptionHistory());
    dispatch(fetchVendorPayments());
  }, []);

  const handleViewInvoice = (invoice) => {
    navigation.navigate('SubscriptionDetail', { invoice });
  };

  const safeHistory = Array.isArray(subscriptionHistory) ? subscriptionHistory : [];
  const safePayments = Array.isArray(payments) ? payments : [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Payments & Subscriptions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Banner */}
        <View style={[styles.heroBanner, SHADOWS.md]}>
          <View style={styles.heroTextWrap}>
            <Text style={styles.heroTitle}>Payments & Subscriptions</Text>
            <Text style={styles.heroSubtitle}>Access invoices, booking payments & transactions</Text>
          </View>
          <TouchableOpacity
            style={styles.browsePlansBtn}
            onPress={() => navigation.navigate('SubscriptionPlans')}
            activeOpacity={0.8}
          >
            <Text style={styles.browsePlansText}>Plans</Text>
          </TouchableOpacity>
        </View>

        {/* Billing History List */}
        <Text style={[styles.sectionHeading, { color: colors.text }]}>Billing History & Invoices</Text>

        {loading && !safeHistory.length && !mySubscription ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : safeHistory.length > 0 ? (
          safeHistory.map((inv) => (
            <HistoryCard key={inv._id || inv.id} invoice={inv} onViewInvoice={handleViewInvoice} colors={colors} />
          ))
        ) : mySubscription ? (
          <HistoryCard invoice={mySubscription} onViewInvoice={handleViewInvoice} colors={colors} />
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Feather name="credit-card" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Past Invoices</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              You currently do not have any active or past subscription invoices.
            </Text>
          </View>
        )}

        {/* Section 2: Recent Payment Transactions */}
        <Text style={[styles.sectionHeading, { color: colors.text, marginTop: 24 }]}>
          Booking Payment Transactions
        </Text>

        {paymentsLoading && !safePayments.length ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: 20 }} />
        ) : safePayments.length > 0 ? (
          safePayments.map((p) => (
            <PaymentTransactionCard key={p.id || p._id} payment={p} colors={colors} />
          ))
        ) : (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Feather name="dollar-sign" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Payment Transactions Yet</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Customer booking payment transactions will appear here automatically.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
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

  heroBanner: {
    backgroundColor: '#0F172A',
    borderRadius: SIZES.radiusLg,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  heroTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: SIZES.base + 1,
    fontWeight: '800',
    marginBottom: 4,
  },
  heroSubtitle: {
    color: '#94A3B8',
    fontSize: SIZES.xs,
    lineHeight: 16,
  },
  browsePlansBtn: {
    backgroundColor: '#0F766E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  browsePlansText: {
    color: '#FFFFFF',
    fontSize: SIZES.xs,
    fontWeight: '800',
  },

  sectionHeading: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 12,
  },

  card: {
    borderRadius: SIZES.radiusLg,
    padding: 18,
    borderWidth: 1,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  planTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  awardBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planName: {
    fontSize: SIZES.base,
    fontWeight: '800',
  },
  durationLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    backgroundColor: 'rgba(15, 118, 110, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusPillText: {
    color: '#0F766E',
    fontSize: 9,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    marginVertical: 14,
  },

  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  detailCol: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  detailAmount: {
    fontSize: SIZES.lg,
    fontWeight: '900',
  },

  viewReceiptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  viewReceiptText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: SIZES.xs,
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
    marginBottom: 20,
  },
  subscribeCta: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  subscribeCtaText: {
    color: '#FFFFFF',
    fontSize: SIZES.xs,
    fontWeight: '800',
  },
});

export default MySubscriptionScreen;