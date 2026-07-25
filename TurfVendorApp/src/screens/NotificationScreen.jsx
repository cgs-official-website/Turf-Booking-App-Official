// @theme-ready ✅
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Modal, Pressable,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { fetchBookings, fetchMySubscription } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Feather from 'react-native-vector-icons/Feather';

// ---- helpers -------------------------------------------------------------

const dayLabel = (date) => {
  const d = new Date(date);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const sameDay = (a, b) => a.toDateString() === b.toDateString();

  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { weekday: 'long' });
};

const timeAgo = (date) => {
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

// Build notification objects out of bookings + subscription/plan events
const buildBookingNotifications = (bookings = [], colors) => bookings.map((b) => {
  let title = 'New Booking Request';
  let body = `${b.userName || b.customerName || 'A player'} requested a slot on ${b.date || ''}`.trim();
  let icon = 'calendar';
  let color = colors.primary;

  if (b.status === 'confirmed' || b.status === 'accepted') {
    title = 'Booking Accepted';
    body = `You accepted the booking for ${b.date || 'the selected slot'}`;
    icon = 'check-circle';
    color = colors.success || colors.primary;
  } else if (b.status === 'rejected' || b.status === 'cancelled') {
    title = 'Booking Rejected';
    body = `The booking for ${b.date || 'the selected slot'} was rejected`;
    icon = 'x-circle';
    color = colors.error;
  } else if (b.status === 'pending') {
    title = 'New Booking Request';
    body = `${b.userName || b.customerName || 'A player'} is waiting for your response`;
    icon = 'clock';
    color = colors.primary;
  }

  return {
    id: `booking-${b._id}`,
    type: 'booking',
    title,
    body,
    icon,
    color,
    date: b.updatedAt || b.createdAt,
    read: !!b.read,
    raw: b,
  };
});

const buildSubscriptionNotifications = (mySubscription, colors) => {
  if (!mySubscription) return [];
  const list = [];

  if (mySubscription.status === 'active') {
    list.push({
      id: `sub-${mySubscription._id}-purchased`,
      type: 'subscription',
      title: 'Subscription Activated',
      body: `Your ${mySubscription.plan?.name || 'plan'} subscription is now active`,
      icon: 'award',
      color: colors.primary,
      date: mySubscription.startDate || mySubscription.createdAt,
      read: !!mySubscription.read,
      raw: mySubscription,
    });
  }

  if (mySubscription.expiryDate) {
    const daysLeft = Math.ceil(
      (new Date(mySubscription.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysLeft <= 7 && daysLeft >= 0) {
      list.push({
        id: `sub-${mySubscription._id}-expiring`,
        type: 'subscription',
        title: 'Subscription Expiring Soon',
        body: `Your plan expires in ${daysLeft} day${daysLeft === 1 ? '' : 's'}. Renew to avoid interruption`,
        icon: 'alert-circle',
        color: colors.error,
        date: new Date(),
        read: false,
        raw: mySubscription,
      });
    }
  }

  return list;
};

const SORT_OPTIONS = [
  { key: 'newest', label: 'Newest First' },
  { key: 'oldest', label: 'Older First' },
  { key: 'read', label: 'Read Notification' },
  { key: 'unread', label: 'Unread Notification' },
];

// ---- component ------------------------------------------------------------

const NotificationScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { bookings, mySubscription, loading } = useSelector((s) => s.vendor);

  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const [sortBy, setSortBy] = useState('newest');
  const [sortVisible, setSortVisible] = useState(false);

  // Hide default navigation header to remove white space
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
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

    let sorted = [...combined];
    if (sortBy === 'newest') {
      sorted.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else if (sortBy === 'oldest') {
      sorted.sort((a, b) => new Date(a.date) - new Date(b.date));
    } else if (sortBy === 'read') {
      sorted = sorted.filter((n) => n.read);
    } else if (sortBy === 'unread') {
      sorted = sorted.filter((n) => !n.read);
    }
    return sorted;
  }, [bookings, mySubscription, sortBy, colors]);

  // group by day label, preserving sort order
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
      navigation.navigate('BookingDetail', { bookingId: item.raw._id });
    } else if (item.type === 'subscription') {
      navigation.navigate('SubscriptionPlans');
    }
  };

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label || 'Sort By';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Feather name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <TouchableOpacity
          style={styles.sortBtn}
          activeOpacity={0.7}
          onPress={() => setSortVisible(true)}
        >
          <Text style={styles.sortBtnText}>Sort BY</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
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
          <View style={styles.empty}>
            <View style={styles.emptyIconContainer}>
              <Feather name="bell-off" size={32} color={colors.textSecondary} />
            </View>
            <Text style={styles.emptyText}>No notifications yet</Text>
          </View>
        )}
        renderItem={({ item: section }) => (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{section.label}</Text>
            {section.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.notifRow}
                activeOpacity={0.7}
                onPress={() => handlePressNotification(item)}
              >
                <View style={[styles.notifIcon, { backgroundColor: !item.read ? colors.text : `${item.color}20` }]}>
                  <Feather
                    name={!item.read ? 'mail' : item.icon}
                    size={18}
                    color={!item.read ? colors.background : item.color}
                  />
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifTitle}>{item.title}</Text>
                  <Text style={styles.notifDesc} numberOfLines={2}>{item.body}</Text>
                </View>
                <Text style={styles.notifTime}>{timeAgo(item.date)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      />

      {/* Sort By modal */}
      <Modal visible={sortVisible} transparent animationType="fade" onRequestClose={() => setSortVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSortVisible(false)}>
          <Pressable style={[styles.sortSheet, SHADOWS.md]} onPress={() => {}}>
            <Text style={styles.sortSheetTitle}>Sort By</Text>
            {SORT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.key}
                style={styles.sortOption}
                activeOpacity={0.7}
                onPress={() => {
                  setSortBy(opt.key);
                  setSortVisible(false);
                }}
              >
                <Text style={styles.sortOptionText}>{opt.label}</Text>
                <View style={[styles.radioOuter, sortBy === opt.key && styles.radioOuterActive]}>
                  {sortBy === opt.key && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.padding,
    paddingTop: 20,
    paddingBottom: 16,
  },
  backBtn: { padding: 4, marginRight: 10 },
  headerTitle: { flex: 1, fontSize: SIZES.xl, fontWeight: '800', color: colors.text },
  sortBtn: {
    backgroundColor: colors.card || colors.background,
    borderRadius: SIZES.radiusLg,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnText: { color: colors.text, fontSize: SIZES.sm, fontWeight: '700' },

  listContent: { paddingHorizontal: SIZES.padding, paddingBottom: 110 },

  section: { marginBottom: 8 },
  sectionLabel: {
    color: colors.textSecondary,
    fontSize: SIZES.sm,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 10,
  },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notifIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notifBody: { flex: 1, marginRight: 8 },
  notifTitle: { fontSize: SIZES.base, fontWeight: '700', color: colors.text, marginBottom: 4 },
  notifDesc: { fontSize: SIZES.sm, color: colors.textSecondary, lineHeight: 18 },
  notifTime: { fontSize: 11, color: colors.textSecondary, alignSelf: 'flex-start', marginTop: 2 },

  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyIconContainer: {
    backgroundColor: colors.inputBg || colors.border,
    padding: 20,
    borderRadius: 50,
    marginBottom: 10,
  },
  emptyText: { color: colors.textSecondary, fontSize: SIZES.base, marginTop: 10 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sortSheet: {
    backgroundColor: colors.card || colors.background,
    borderTopLeftRadius: SIZES.radiusLg,
    borderTopRightRadius: SIZES.radiusLg,
    padding: 24,
    paddingBottom: 36,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortSheetTitle: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginBottom: 16 },
  sortOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sortOptionText: { fontSize: SIZES.base, color: colors.text, fontWeight: '500' },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: { borderColor: colors.success || colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.success || colors.primary },
});

export default NotificationScreen;