// @theme-ready ✅
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboard, fetchBookings, fetchMyTurfs, fetchPlans, fetchMySubscription, fetchNotifications,
} from '../redux/vendorSlice';
import RecentBookingCard from '../components/RecentBookingCard';
import PendingRequestCard from '../components/PendingRequestCard';
import PlanPromoCard from '../components/PlanPromoCard';
import TurfSwitcher from '../components/TurfSwitcher';
import Icon from '../components/Icon';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);
  const {
    dashboardStats, bookings, loading, turfs, plans, mySubscription,
  } = useSelector((s) => s.vendor);
  const { vendor } = useSelector((s) => s.auth);

  const [period, setPeriod] = useState('month'); // 'today' | 'month'

  const loadData = () => {
    dispatch(fetchDashboard());
    dispatch(fetchBookings());
    dispatch(fetchMyTurfs());
    dispatch(fetchMySubscription());
    dispatch(fetchNotifications());
    if (!plans.length) dispatch(fetchPlans());
  };

  useEffect(() => { loadData(); }, []);

  const safeBookings = Array.isArray(bookings) ? bookings : [];
  const safeTurfs = Array.isArray(turfs) ? turfs : [];
  const safePlans = Array.isArray(plans) ? plans : [];

  const pendingBookings = safeBookings.filter((b) => b && b.status === 'pending');
  const confirmedBookings = safeBookings.filter((b) => b && ['confirmed', 'accepted', 'completed'].includes(b.status));
  const rejectedCount = useMemo(
    () => safeBookings.filter((b) => b && b.status === 'rejected').length,
    [safeBookings]
  );
  const oldestPending = useMemo(
    () => [...pendingBookings].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0],
    [pendingBookings]
  );
  const recentBookings = useMemo(
    () => [...safeBookings].sort((a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date)).slice(0, 3),
    [safeBookings]
  );
  const topPlan = useMemo(
    () => [...safePlans].sort((a, b) => b.price - a.price)[0],
    [safePlans]
  );

  const stats = dashboardStats || {};
  const totalRevenue = stats.totalRevenue ?? (
    confirmedBookings.reduce((sum, b) => sum + (Number(b.totalAmount || b.amount) || 0), 0)
  );
  const todayBookingsCount = stats.todayBookingsCount ?? (
    safeBookings.filter((b) => b.date === new Date().toISOString().split('T')[0]).length
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[colors.primary]} />}
      >
        {/* Top Switcher Bar */}
        <TurfSwitcher navigation={navigation} onBellPress={() => navigation.navigate('Notifications')} />

        {/* Greeting Subtitle */}
        <View style={styles.greetingRow}>
          <View>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.vendorHeading} numberOfLines={1}>{vendor?.name || 'Vendor Partner'}</Text>
          </View>
          <View style={styles.liveStatusPill}>
            <View style={styles.pulseDot} />
            <Text style={styles.liveStatusText}>LIVE</Text>
          </View>
        </View>

        {/* Revenue & Overview Hero Banner */}
        <View style={[styles.revenueCard, SHADOWS.md]}>
          <View style={styles.revenueTopRow}>
            <View>
              <Text style={styles.revenueLabel}>TOTAL REVENUE</Text>
              <Text style={styles.revenueAmount}>₹{Number(totalRevenue).toLocaleString('en-IN')}</Text>
            </View>
            <View style={styles.growthBadge}>
              <Icon name="trending-up" size={14} color={colors.primary} />
              <Text style={styles.growthText}>Active</Text>
            </View>
          </View>

          <View style={styles.revenueDivider} />

          <View style={styles.revenueMetricsRow}>
            <View style={styles.revenueMetric}>
              <Text style={styles.metricLabel}>TODAY'S BOOKINGS</Text>
              <Text style={styles.metricValue}>{todayBookingsCount}</Text>
            </View>
            <View style={styles.metricSeparator} />
            <View style={styles.revenueMetric}>
              <Text style={styles.metricLabel}>ACTIVE TURFS</Text>
              <Text style={styles.metricValue}>{safeTurfs.length || 1}</Text>
            </View>
            <View style={styles.metricSeparator} />
            <View style={styles.revenueMetric}>
              <Text style={styles.metricLabel}>PENDING</Text>
              <Text style={[styles.metricValue, pendingBookings.length > 0 && { color: colors.warning }]}>
                {pendingBookings.length}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Actions Bar */}
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={[styles.quickActionBtn, SHADOWS.sm]}
            onPress={() => navigation.navigate('AddTurf')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: colors.primaryLight }]}>
              <Icon name="plus" size={18} color={colors.primary} />
            </View>
            <Text style={styles.actionLabel}>Add Turf</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, SHADOWS.sm]}
            onPress={() => navigation.navigate('SlotsTab')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Icon name="clock" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.actionLabel}>Slots</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, SHADOWS.sm]}
            onPress={() => navigation.navigate('BookingsTab')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(168, 85, 247, 0.12)' }]}>
              <Icon name="calendar" size={18} color="#A855F7" />
            </View>
            <Text style={styles.actionLabel}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionBtn, SHADOWS.sm]}
            onPress={() => navigation.navigate('UserReviews')}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Icon name="star" size={18} color="#F59E0B" />
            </View>
            <Text style={styles.actionLabel}>Reviews</Text>
          </TouchableOpacity>
        </View>

        {/* Pending Request Alert (If Any) */}
        {oldestPending ? (
          <View style={{ marginBottom: 8 }}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={styles.alertPulse} />
                <Text style={styles.sectionTitle}>Action Required</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('BookingsTab')}>
                <Text style={styles.seeAll}>View All ({pendingBookings.length})</Text>
              </TouchableOpacity>
            </View>
            <PendingRequestCard booking={oldestPending} onAccepted={loadData} />
          </View>
        ) : null}

        {/* Overview Stats Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Performance</Text>
          <View style={styles.monthPill}>
            <Text style={styles.monthPillText}>This Month</Text>
            <Icon name="calendar" size={12} color={colors.primary} />
          </View>
        </View>

        <View style={styles.statsGrid}>
          <View style={[styles.statBox, SHADOWS.sm]}>
            <View style={[styles.statIconWrap, { backgroundColor: colors.primaryLight }]}>
              <Icon name="calendar" size={18} color={colors.primary} />
            </View>
            <Text style={styles.statNumber}>{stats.totalBookings ?? safeBookings.length}</Text>
            <Text style={styles.statTitle}>Total Bookings</Text>
          </View>

          <View style={[styles.statBox, SHADOWS.sm]}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Icon name="check-circle" size={18} color={colors.success} />
            </View>
            <Text style={styles.statNumber}>{stats.confirmedBookings ?? confirmedBookings.length}</Text>
            <Text style={styles.statTitle}>Accepted</Text>
          </View>

          <View style={[styles.statBox, SHADOWS.sm]}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Icon name="clock" size={18} color="#3B82F6" />
            </View>
            <Text style={styles.statNumber}>{stats.availableSlots ?? 24}</Text>
            <Text style={styles.statTitle}>Open Slots</Text>
          </View>

          <View style={[styles.statBox, SHADOWS.sm]}>
            <View style={[styles.statIconWrap, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
              <Icon name="x-circle" size={18} color={colors.error} />
            </View>
            <Text style={styles.statNumber}>{stats.rejectedBookings ?? rejectedCount}</Text>
            <Text style={styles.statTitle}>Declined</Text>
          </View>
        </View>

        {/* Recent Bookings */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Bookings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('BookingsTab')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentBookings.length > 0 ? (
          recentBookings.map((b) => (
            <RecentBookingCard
              key={b._id || b.id}
              booking={b}
              onPress={() => navigation.navigate('BookingDetail', { bookingId: b._id || b.id })}
            />
          ))
        ) : (
          <View style={[styles.emptyCard, SHADOWS.sm]}>
            <View style={styles.emptyIconCircle}>
              <Icon name="inbox" size={28} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No Bookings Yet</Text>
            <Text style={styles.emptySub}>Your turf is live! Player booking requests will appear here in real-time.</Text>
          </View>
        )}

        {/* Plan Upgrade Promo */}
        <View style={{ marginTop: 6 }}>
          <PlanPromoCard
            mySubscription={mySubscription}
            topPlan={topPlan}
            onPress={() => navigation.navigate('SubscriptionPlans')}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const getStyles = (colors, isDark) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: SIZES.padding, paddingBottom: 110 },

  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 16,
  },
  greetingText: {
    fontSize: SIZES.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  vendorHeading: {
    fontSize: SIZES.xxl,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.5,
    marginTop: 1,
  },
  liveStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 197, 102, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 197, 102, 0.25)',
  },
  pulseDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  liveStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primary,
    letterSpacing: 0.5,
  },

  revenueCard: {
    backgroundColor: colors.secondary,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 16,
  },
  revenueTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  revenueLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  revenueAmount: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  growthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 197, 102, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 4,
  },
  growthText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  revenueDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  revenueMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  revenueMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 4,
    textAlign: 'center',
  },
  metricValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  metricSeparator: {
    width: 1,
    height: 24,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },

  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  monthPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthPillText: {
    color: colors.textSecondary,
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
  seeAll: {
    color: colors.primary,
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  alertPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.warning,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  statBox: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  statTitle: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 2,
  },

  emptyCard: {
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyIconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  emptySub: {
    fontSize: SIZES.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
});

export default DashboardScreen;