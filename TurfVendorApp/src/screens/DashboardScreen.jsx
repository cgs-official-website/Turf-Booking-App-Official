// @theme-ready ✅
import React, { useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchDashboard, fetchBookings, fetchMyTurfs, fetchPlans, fetchMySubscription, fetchNotifications,
} from '../redux/vendorSlice';
import StatCard from '../components/StatCard';
import RecentBookingCard from '../components/RecentBookingCard';
import PendingRequestCard from '../components/PendingRequestCard';
import PlanPromoCard from '../components/PlanPromoCard';
import TurfSwitcher from '../components/TurfSwitcher';
import Icon from '../components/Icon';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

const DashboardScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = useMemo(() => getStyles(colors), [colors]);
  const {
    dashboardStats, bookings, loading, turfs, plans, mySubscription,
  } = useSelector((s) => s.vendor);

  const loadData = () => {
    dispatch(fetchDashboard());
    dispatch(fetchBookings());
    dispatch(fetchMyTurfs());
    dispatch(fetchMySubscription());
    dispatch(fetchNotifications());
    if (!plans.length) dispatch(fetchPlans());
  };

  useEffect(() => { loadData(); }, []);

  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const rejectedCount = useMemo(
    () => bookings.filter((b) => b.status === 'rejected').length,
    [bookings]
  );
  const oldestPending = useMemo(
    () => [...pendingBookings].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))[0],
    [pendingBookings]
  );
  const recentBooking = useMemo(
    () => [...bookings].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0],
    [bookings]
  );
  const topPlan = useMemo(
    () => [...plans].sort((a, b) => b.price - a.price)[0],
    [plans]
  );

  const stats = dashboardStats || {};

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} colors={[colors.primary]} />}
      >
        <TurfSwitcher navigation={navigation} onBellPress={() => navigation.navigate('Notifications')} />

        {oldestPending ? (
          <PendingRequestCard booking={oldestPending} onAccepted={loadData} />
        ) : (
          <View style={[styles.heroCard, SHADOWS.md]}>
            <View style={styles.heroIconBox}>
              <Icon name="award" size={40} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Your Turf Is Ready</Text>
            <Text style={styles.heroSubtitle}>
              {turfs.length === 0
                ? 'Add your first turf to start receiving bookings from players.'
                : 'No booking requests yet. Share your turf and start receiving bookings from players.'}
            </Text>
          </View>
        )}

        {/* Overview */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <TouchableOpacity style={styles.monthPicker} activeOpacity={0.7}>
            <Text style={styles.monthText}>This Month</Text>
            <Icon name="chevron-down" size={14} color={colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <StatCard title="Total Bookings" value={stats.totalBookings ?? 0} icon="calendar" color={colors.primary} />
          <StatCard title="Accepted" value={stats.confirmedBookings ?? stats.acceptedBookings ?? 0} icon="check-circle" color={colors.success} />
        </View>
        <View style={styles.statsRow}>
          <StatCard title="Available Slots" value={stats.availableSlots ?? 0} icon="clock" color={colors.primary} />
          <StatCard title="Rejected" value={stats.rejectedBookings ?? rejectedCount} icon="x-circle" color={colors.error} />
        </View>

        {/* Recent Booking */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Booking</Text>
          <TouchableOpacity onPress={() => navigation.navigate('BookingsTab')}>
            <Text style={styles.seeAll}>See All</Text>
          </TouchableOpacity>
        </View>

        {recentBooking ? (
          <RecentBookingCard
            booking={recentBooking}
            onPress={() => navigation.navigate('BookingDetail', { bookingId: recentBooking._id })}
          />
        ) : (
          <View style={styles.empty}>
            <Icon name="inbox" size={32} color={colors.textLight} />
            <Text style={styles.emptyText}>No bookings yet</Text>
          </View>
        )}

        {/* Plan */}
        <PlanPromoCard
          mySubscription={mySubscription}
          topPlan={topPlan}
          onPress={() => navigation.navigate('SubscriptionPlans')}
        />
      </ScrollView>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: SIZES.padding, paddingBottom: 110 },

  heroCard: {
    backgroundColor: colors.secondary,
    borderRadius: SIZES.radiusLg,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconBox: {
    width: 72, height: 72, borderRadius: 18, backgroundColor: colors.white,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
   heroTitle: { color: '#FFFFFF', fontSize: SIZES.xxl, fontWeight: '800', marginBottom: 10 },
  heroSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: SIZES.sm, textAlign: 'center', lineHeight: 20 },

  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, marginBottom: 12,
  },
  sectionTitle: { fontSize: SIZES.xl, fontWeight: '800', color: colors.text },
  monthPicker: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  monthText: { color: colors.primary, fontSize: SIZES.sm, fontWeight: '700', marginRight: 4 },
  seeAll: { color: colors.primary, fontSize: SIZES.sm, fontWeight: '700' },

  statsRow: { flexDirection: 'row', marginHorizontal: -6 },

  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: colors.textSecondary, fontSize: SIZES.base, marginTop: 10 },
});

export default DashboardScreen;