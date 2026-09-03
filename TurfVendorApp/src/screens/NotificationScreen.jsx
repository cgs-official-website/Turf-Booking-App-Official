// @theme-ready ✅
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Pressable,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookings, fetchMySubscription } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FILTERS = ['All', 'Bookings', 'Subscription', 'Unread'];

const dayLabel = (date) => {
  if (!date) return 'Earlier';
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', weekday: 'short' });
};

const timeAgo = (date) => {
  if (!date) return 'Just now';
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const buildBookingNotifications = (bookings = [], colors) => (Array.isArray(bookings) ? bookings : []).map((b) => {
  let title = 'New Booking Request';
  let body = `${b.userName || b.customerName || 'A player'} requested a slot on ${b.date || 'today'}`;
  let icon = 'calendar';
  let iconBg = 'rgba(59, 130, 246, 0.12)';
  let iconColor = '#3B82F6';

  if (b.status === 'confirmed' || b.status === 'accepted') {
    title = 'Booking Confirmed';
    body = `Slot for ${b.userName || 'Player'} on ${b.date || 'selected date'} is confirmed`;
    icon = 'check-circle';
    iconBg = 'rgba(0, 197, 102, 0.12)';
    iconColor = '#00C566';
  } else if (b.status === 'rejected' || b.status === 'cancelled') {
    title = 'Booking Cancelled';
    body = `Reservation for ${b.userName || 'Player'} has been cancelled`;
    icon = 'x-circle';
    iconBg = 'rgba(239, 68, 68, 0.12)';
    iconColor = '#EF4444';
  } else if (b.status === 'pending') {
    title = 'Pending Reservation';
    body = `${b.userName || 'Player'} is waiting for your slot confirmation`;
    icon = 'clock';
    iconBg = 'rgba(245, 158, 11, 0.12)';
    iconColor = '#F59E0B';
  }

  return {
    id: `booking-${b._id || b.id || Math.random()}`,
    type: 'booking',
    title,
    body,
    icon,
    iconBg,
    iconColor,
    date: b.updatedAt || b.createdAt || new Date(),
    read: b.status !== 'pending',
    raw: b,
  };
});

const buildSubscriptionNotifications = (mySubscription, colors) => {
  if (!mySubscription) return [];
  const list = [];

  if (mySubscription.status === 'active') {
    list.push({
      id: `sub-${mySubscription._id || 'active'}`,
      type: 'subscription',
      title: 'Subscription Active',
      body: `Your ${mySubscription.plan?.name || 'Partner Pro'} membership is active`,
      icon: 'zap',
      iconBg: 'rgba(168, 85, 247, 0.12)',
      iconColor: '#A855F7',
      date: mySubscription.startDate || mySubscription.createdAt || new Date(),
      read: true,
      raw: mySubscription,
    });
  }
  return list;
};

const NotificationScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { bookings, mySubscription, loading } = useSelector((s) => s.vendor);
  const { colors, isDark } = useTheme();

  const [activeFilter, setActiveFilter] = useState('All');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchBookings());
    dispatch(fetchMySubscription());
  }, []);

  const notifications = useMemo(() => {
    const combined = [
      ...buildBookingNotifications(bookings, colors),
      ...buildSubscriptionNotifications(mySubscription, colors),
    ];

    let sorted = combined.sort((a, b) => new Date(b.date) - new Date(a.date));

    if (activeFilter === 'Bookings') return sorted.filter((n) => n.type === 'booking');
    if (activeFilter === 'Subscription') return sorted.filter((n) => n.type === 'subscription');
    if (activeFilter === 'Unread') return sorted.filter((n) => !n.read);
    return sorted;
  }, [bookings, mySubscription, activeFilter, colors]);

  const sections = useMemo(() => {
    const map = new Map();
    notifications.forEach((n) => {
      const label = dayLabel(n.date);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(n);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [notifications]);

  const handlePressNotification = (item) => {
    if (item.type === 'booking') {
      const bookingId = item.raw?._id || item.raw?.id;
      if (bookingId) {
        navigation.navigate('BookingDetail', { bookingId });
      } else {
        navigation.navigate('BookingsTab');
      }
    } else if (item.type === 'subscription') {
      navigation.navigate('SubscriptionPlans');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {FILTERS.map((f) => {
            const isSelected = activeFilter === f;
            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterChip,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      <FlatList
        data={sections}
        keyExtractor={(s) => s.label}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshing={loading}
        onRefresh={() => {
          dispatch(fetchBookings());
          dispatch(fetchMySubscription());
        }}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.primaryLight }]}>
              <Feather name="bell" size={32} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>You're All Caught Up!</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              New reservations, player messages, and system alerts will appear here.
            </Text>
          </View>
        )}
        renderItem={({ item: section }) => (
          <View style={styles.sectionWrap}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{section.label.toUpperCase()}</Text>
            </View>

            <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
              {section.items.map((item, idx) => {
                const isLast = idx === section.items.length - 1;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.notifRow,
                      !isLast && [styles.notifRowBorder, { borderBottomColor: colors.border }],
                    ]}
                    activeOpacity={0.75}
                    onPress={() => handlePressNotification(item)}
                  >
                    <View style={[styles.iconBox, { backgroundColor: item.iconBg }]}>
                      <Feather name={item.icon} size={18} color={item.iconColor} />
                    </View>

                    <View style={styles.notifBody}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, { color: colors.text }]} numberOfLines={1}>{item.title}</Text>
                        {!item.read && <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
                      </View>
                      <Text style={[styles.notifDesc, { color: colors.textSecondary }]} numberOfLines={2}>{item.body}</Text>
                      <Text style={[styles.notifTime, { color: colors.textSecondary }]}>{timeAgo(item.date)}</Text>
                    </View>

                    <Feather name="chevron-right" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      />
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

  filterBar: {
    paddingBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: SIZES.padding,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  listContent: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },
  sectionWrap: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 8,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionCard: {
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  notifRowBorder: {
    borderBottomWidth: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBody: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  notifTitle: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifDesc: {
    fontSize: SIZES.xs,
    lineHeight: 16,
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 10,
    fontWeight: '500',
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 30,
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
    lineHeight: 18,
  },
});

export default NotificationScreen;