import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Image, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { bookingsApi } from '../api/bookings';
import { getImageUrl as _getImageUrl, BASE_URL } from '../api/client';
import RateReviewModal from './RateReviewModal';
import { StatusBadge } from '../components/RatingBadge';
import EmptyState from '../components/EmptyState';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme';

const TABS = ['confirmed', 'pending', 'completed'];
const TAB_LABEL = { confirmed: 'Confirmed', pending: 'Pending', completed: 'Past Bookings' };

const getImageUrl = typeof _getImageUrl === 'function' ? _getImageUrl : (path) => {
  if (!path) return null;
  if (/^(https?:|file:|content:|data:image)/.test(path)) return path;
  const serverRoot = BASE_URL.replace(/\/api\/?$/, '');
  return `${serverRoot}${path.startsWith('/') ? '' : '/'}${path}`;
};

const to12Hr = (time24) => {
  const [hStr, mStr] = String(time24).split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { h, m: mStr?.padStart(2, '0') || '00', period };
};

const formatDuration = (startTime, endTime) => {
  if (!startTime || !endTime) return '';
  const s = to12Hr(startTime);
  const e = to12Hr(endTime);
  const startStr = `${String(s.h).padStart(2, '0')}:${s.m}`;
  const endStr = `${String(e.h).padStart(2, '0')}:${e.m}`;
  if (s.period === e.period) return `${startStr} - ${endStr} ${e.period}`;
  return `${startStr} ${s.period} - ${endStr} ${e.period}`;
};

export default function MyBookingsScreen({ navigation }) {
  const { C, dark } = useTheme();
  const [tab, setTab] = useState('confirmed');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    bookingsApi.getMyBookings()
      .then((res) => {
        const list = res.bookings || res.items || res.data?.items || res.data?.bookings || (Array.isArray(res) ? res : []);
        setBookings(list);
      })
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isExpiredPending = (b) => {
    if (b.status !== 'pending' || !b.date || !b.endTime) return false;
    const datePart = String(b.date).split('T')[0];
    const end = new Date(`${datePart}T${b.endTime}:00`);
    if (isNaN(end.getTime())) return false;
    return end.getTime() < Date.now();
  };

  const getEffectiveStatus = (b) => {
    if (b.status === 'confirmed') return 'confirmed';
    if (b.status === 'completed') return 'completed';
    if (isExpiredPending(b)) return 'rejected';
    return b.status || 'confirmed';
  };

  const filtered = bookings.filter((b) => {
    const st = getEffectiveStatus(b);
    if (tab === 'confirmed') return st === 'confirmed';
    if (tab === 'pending') return st === 'pending' || st === 'reserved';
    if (tab === 'completed') return st === 'completed' || st === 'cancelled' || st === 'rejected';
    return true;
  });

  const openBooking = (b) => {
    if (getEffectiveStatus(b) === 'pending') {
      navigation.navigate('RequestPending', { bookingId: b._id || b.id });
    } else {
      navigation.navigate('BookingDetail', { bookingId: b._id || b.id });
    }
  };

  const handleSubmitReview = async (rating, comment) => {
    if (!reviewTarget) return;
    const bookingId = reviewTarget._id || reviewTarget.id;
    const turfId = reviewTarget.turfId || reviewTarget.turf?._id || reviewTarget.turf?.id;
    try {
      await bookingsApi.addReview(bookingId, { rating, comment, turfId });
      setBookings((prev) => prev.map((b) => ((b._id || b.id) === bookingId ? { ...b, reviewed: true, isReviewed: true } : b)));
    } catch (err) {
      console.warn('Failed to submit review:', err.message);
    } finally {
      setReviewTarget(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>

        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: C.text }]}>My Booking Passes</Text>
        </View>

        {/* Segmented Tabs */}
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: active ? C.primaryLight : 'transparent',
                    borderColor: active ? C.primary : 'transparent',
                  },
                ]}
                onPress={() => setTab(t)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.tabText,
                    {
                      color: active ? C.primary : C.subtext,
                      fontWeight: active ? '800' : '600',
                    },
                  ]}
                >
                  {TAB_LABEL[t]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Bookings Feed */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id || item.id || String(Math.random())}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <EmptyState
              icon="calendar"
              title={`No ${TAB_LABEL[tab]} Found`}
              description={`You do not have any ${TAB_LABEL[tab].toLowerCase()} right now. Explore top-rated venues and reserve a pitch.`}
              actionText="Explore Turfs & Book"
              onActionPress={() => navigation.navigate('Home')}
            />
          }
          renderItem={({ item }) => {
            const dateStr = item.date ? new Date(item.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' }) : '';
            const turfImg = item.turf?.images?.[0] || item.turf?.image;
            const imgUri = getImageUrl(turfImg);

            return (
              <TouchableOpacity
                style={[
                  styles.bookingCard,
                  {
                    backgroundColor: dark ? '#131E2F' : '#FFFFFF',
                    borderColor: dark ? '#223249' : '#E2E8F0',
                  },
                  SHADOW.subtle,
                ]}
                onPress={() => openBooking(item)}
                activeOpacity={0.85}
              >
                <View style={styles.cardTopRow}>
                  {imgUri ? (
                    <Image source={{ uri: imgUri }} style={styles.turfThumb} />
                  ) : (
                    <View style={[styles.turfThumbPlaceholder, { backgroundColor: C.primaryLight }]}>
                      <Feather name="activity" size={20} color={C.primary} />
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.cardTurfName, { color: C.text }]} numberOfLines={1}>
                        {item.turf?.name || 'Turf Stadium'}
                      </Text>
                      <StatusBadge status={getEffectiveStatus(item)} />
                    </View>

                    <Text style={[styles.cardLocation, { color: C.subtext }]} numberOfLines={1}>
                      {item.turf?.location?.address || item.turf?.location?.city || 'Local Arena'}
                    </Text>

                    <View style={styles.timeBadgeRow}>
                      <Feather name="clock" size={12} color={C.primary} style={{ marginRight: 4 }} />
                      <Text style={[styles.timeText, { color: C.text }]}>
                        {dateStr} • {formatDuration(item.startTime, item.endTime)}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Footer with Amount & Actions */}
                <View style={[styles.cardFooter, { borderTopColor: C.border }]}>
                  <View>
                    <Text style={[styles.priceLabel, { color: C.caption }]}>Paid Amount</Text>
                    <Text style={[styles.priceValue, { color: C.primary }]}>₹{item.totalAmount || 800}</Text>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    {tab === 'completed' && !item.reviewed && (
                      <TouchableOpacity
                        style={[styles.rateBtn, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                        onPress={() => setReviewTarget(item)}
                      >
                        <Feather name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
                        <Text style={[styles.rateBtnText, { color: C.text }]}>Rate Ground</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      style={[styles.passBtn, { backgroundColor: C.primary }]}
                      onPress={() => openBooking(item)}
                    >
                      <Text style={styles.passBtnText}>View Pass →</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>

      {reviewTarget && (
        <RateReviewModal
          visible={!!reviewTarget}
          turfName={reviewTarget.turf?.name || 'Turf'}
          onClose={() => setReviewTarget(null)}
          onSubmit={handleSubmitReview}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 10,
  },
  title: {
    ...FONT.h1,
    fontSize: 22,
    fontWeight: '800',
  },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    gap: 8,
    marginBottom: 12,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 100,
    gap: 12,
  },
  bookingCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 2,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  turfThumb: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.lg,
  },
  turfThumbPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTurfName: {
    ...FONT.h3,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 6,
  },
  cardLocation: {
    fontSize: 12,
    marginBottom: 6,
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
  },
  priceLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '900',
  },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  rateBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  passBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
  },
  passBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
});