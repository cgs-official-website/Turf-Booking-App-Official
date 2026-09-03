// src/screens/NotificationsScreen.jsx
import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image,
  TouchableOpacity, RefreshControl, ScrollView,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { notificationsApi } from '../api/notifications';
import { SPACING, RADIUS } from '../utils/theme';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import useTheme from '../hooks/useTheme';

const FILTERS = ['All', 'Bookings', 'Matches', 'Unread'];

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

export default function NotificationsScreen({ navigation }) {
  const { C } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const TYPE_CONFIG = {
    BookingConfirmed: { icon: 'check-circle', iconBg: 'rgba(12, 176, 83, 0.12)', color: '#0CB053' },
    BookingRejected: { icon: 'x-circle', iconBg: 'rgba(239, 68, 68, 0.12)', color: '#EF4444' },
    BookingExpired: { icon: 'clock', iconBg: 'rgba(245, 158, 11, 0.12)', color: '#F59E0B' },
    BookingReminder: { icon: 'bell', iconBg: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' },
    MatchInvite: { icon: 'award', iconBg: 'rgba(168, 85, 247, 0.12)', color: '#A855F7' },
    General: { icon: 'bell', iconBg: 'rgba(100, 116, 139, 0.12)', color: '#64748B' },
  };

  const load = useCallback(() => {
    setLoading(true);
    notificationsApi.getAll()
      .then((r) => setNotifications(r.notifications || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id);
    } catch {}
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
  };

  const markAll = async () => {
    try {
      await notificationsApi.markAllRead();
    } catch {}
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const filtered = useMemo(() => {
    let list = [...notifications];
    if (activeFilter === 'Bookings') {
      list = list.filter((n) => (n.type || '').toLowerCase().includes('booking'));
    } else if (activeFilter === 'Matches') {
      list = list.filter((n) => (n.type || '').toLowerCase().includes('match'));
    } else if (activeFilter === 'Unread') {
      list = list.filter((n) => !n.read);
    }
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [notifications, activeFilter]);

  const sections = useMemo(() => {
    const map = new Map();
    filtered.forEach((n) => {
      const label = dayLabel(n.createdAt);
      if (!map.has(label)) map.set(label, []);
      map.get(label).push(n);
    });
    return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
  }, [filtered]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]}>
      {/* Top Navbar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.title, { color: C.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.unreadCount, { color: C.primary }]}>{unreadCount} unread alerts</Text>
          )}
        </View>

        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAll} activeOpacity={0.7}>
            <Text style={[styles.markAllText, { color: C.primary }]}>Mark all read</Text>
          </TouchableOpacity>
        )}
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
                  { backgroundColor: C.card, borderColor: C.border },
                  isSelected && { backgroundColor: C.primary, borderColor: C.primary },
                ]}
                onPress={() => setActiveFilter(f)}
                activeOpacity={0.8}
              >
                <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : C.text }]}>{f}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Notification List */}
      <FlatList
        data={sections}
        keyExtractor={(s) => s.label}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyWrap}>
              <View style={[styles.emptyIconCircle, { backgroundColor: C.primaryLight }]}>
                <Feather name="bell" size={32} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text }]}>You're All Caught Up!</Text>
              <Text style={[styles.emptySub, { color: C.subtext }]}>
                Slot booking updates, match schedules, and reminders will appear here.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item: section }) => (
          <View style={styles.sectionWrap}>
            <Text style={[styles.sectionLabel, { color: C.subtext }]}>{section.label.toUpperCase()}</Text>

            <View style={[styles.sectionCard, { backgroundColor: C.card, borderColor: C.border }]}>
              {section.items.map((item, idx) => {
                const notifId = item.id || item._id || item.notificationId || `notif_${idx}`;
                const isLast = idx === section.items.length - 1;
                const meta = TYPE_CONFIG[item.type] || TYPE_CONFIG.General;

                return (
                  <TouchableOpacity
                    key={notifId}
                    style={[
                      styles.notifRow,
                      !isLast && [styles.notifRowBorder, { borderBottomColor: C.border }],
                      !item.read && { backgroundColor: 'rgba(12, 176, 83, 0.04)' },
                    ]}
                    onPress={() => {
                      markRead(notifId);
                      if (item.data?.bookingId) {
                        navigation.navigate('BookingDetail', { bookingId: item.data.bookingId });
                      }
                    }}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.iconBox, { backgroundColor: meta.iconBg }]}>
                      <Feather name={meta.icon} size={18} color={meta.color} />
                    </View>

                    <View style={styles.notifBody}>
                      <View style={styles.titleRow}>
                        <Text style={[styles.notifTitle, { color: C.text }]} numberOfLines={1}>{item.title}</Text>
                        {!item.read && <View style={[styles.unreadDot, { backgroundColor: C.primary }]} />}
                      </View>
                      <Text style={[styles.notifDesc, { color: C.subtext }]} numberOfLines={2}>
                        {item.body || item.message || ''}
                      </Text>
                      <Text style={[styles.notifTime, { color: C.subtext }]}>{timeAgo(item.createdAt)}</Text>
                    </View>

                    <Feather name="chevron-right" size={16} color={C.subtext} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
  },
  unreadCount: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 1,
  },
  markAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
  },

  filterBar: {
    paddingBottom: 12,
  },
  filterScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },

  sectionWrap: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  sectionCard: {
    borderRadius: 20,
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
    fontSize: 13,
    fontWeight: '700',
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  notifDesc: {
    fontSize: 12,
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
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
});