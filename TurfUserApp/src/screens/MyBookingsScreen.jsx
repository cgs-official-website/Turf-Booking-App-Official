import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Image, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { bookingsApi } from '../api/bookings';
import { getImageUrl as _getImageUrl, BASE_URL } from '../api/client';
import RateReviewModal from './RateReviewModal';
import { SPACING, RADIUS, FONT } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import Icon from 'react-native-vector-icons/Ionicons';

// ✅ "All" removed per design — only these 3 show as tabs.
// "rejected" is kept out of the tab bar (not in the mockup) but the effective-status
// logic below still exists so an expired pending booking doesn't get stuck looking "Pending".
const TABS = ['pending', 'confirmed', 'completed'];
const TAB_LABEL = { pending: 'Pending', confirmed: 'Confirmed', completed: 'Completed' };

// Defensive wrapper: if ../api/client hasn't exported getImageUrl yet
// (stale metro cache / not-yet-saved file), fall back to a same-logic
// local implementation instead of crashing the whole screen.
const getImageUrl = typeof _getImageUrl === 'function' ? _getImageUrl : (path) => {
  if (!path) return null;
  if (/^(https?:|file:|content:|data:image)/.test(path)) return path;
  const serverRoot = BASE_URL.replace(/\/api\/?$/, '');
  return `${serverRoot}${path.startsWith('/') ? '' : '/'}${path}`;
};

// "13:30" -> { h: 1, m: '30', period: 'PM' }
const to12Hr = (time24) => {
  const [hStr, mStr] = String(time24).split(':');
  let h = parseInt(hStr, 10);
  const period = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return { h, m: mStr?.padStart(2, '0') || '00', period };
};

// combines start+end into "01:30 - 02:30 PM" (single suffix when both share the same period)
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
  const [tab, setTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    bookingsApi.getMyBookings().then((res) => setBookings(res.bookings)).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  // if a booking is still 'pending' but its slot end time has already passed,
  // treat it as 'rejected' in the UI (vendor never actioned it in time).
  const isExpiredPending = (b) => {
    if (b.status !== 'pending' || !b.date || !b.endTime) return false;
    const datePart = String(b.date).split('T')[0];
    const end = new Date(`${datePart}T${b.endTime}:00`);
    if (isNaN(end.getTime())) return false;
    return end.getTime() < Date.now();
  };

  const getEffectiveStatus = (b) => (isExpiredPending(b) ? 'rejected' : b.status);

  const filtered = bookings.filter((b) => getEffectiveStatus(b) === tab);

  const openBooking = (b) => {
    if (getEffectiveStatus(b) === 'pending') navigation.navigate('RequestPending', { bookingId: b._id });
    else navigation.navigate('BookingDetail', { bookingId: b._id });
  };

  const handleSubmitReview = async (rating, comment) => {
    const bookingId = reviewTarget._id;
    try {
      await bookingsApi.addReview(bookingId, { rating, comment });
      setBookings((prev) => prev.map((b) => (b._id === bookingId ? { ...b, reviewed: true } : b)));
    } finally {
      setReviewTarget(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header: back button + title, same row */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={20} color={C.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: C.text }]}>My Bookings</Text>
        </View>

        {/* Underline tabs: Pending / Confirmed / Completed */}
        <View style={styles.tabRow}>
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <TouchableOpacity key={t} style={styles.tabItem} onPress={() => setTab(t)}>
                <Text style={[styles.tabText, { color: active ? C.primary : C.subtext }, active && styles.tabTextActive]}>
                  {TAB_LABEL[t]}
                </Text>
                <View style={[styles.tabUnderline, { backgroundColor: active ? C.primary : 'transparent' }]} />
              </TouchableOpacity>
            );
          })}
        </View>
        <View style={[styles.tabDivider, { backgroundColor: C.border }]} />

        <FlatList
          data={filtered}
          keyExtractor={(b) => b._id}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
          contentContainerStyle={{ padding: SPACING.lg, gap: SPACING.lg }}
          ListEmptyComponent={!loading && (
            <View style={styles.empty}>
              <Icon name="calendar-outline" size={48} color={C.border} />
              <Text style={[styles.emptyText, { color: C.subtext }]}>No bookings here yet</Text>
            </View>
          )}
          renderItem={({ item }) => {
            const status = getEffectiveStatus(item);
            const address = item.turf?.location?.address || item.turf?.location?.city || '';
            // Distance isn't tracked by getMyBookings today — only shown if your
            // turf/location logic already attaches it (e.g. item.turf.distanceKm).
            // We don't fabricate a number if it's missing.
            const distanceKm = item.turf?.distanceKm ?? item.distanceKm;

            return (
              <TouchableOpacity
                style={[styles.card, { backgroundColor: C.card }]}
                onPress={() => openBooking(item)}
                activeOpacity={0.9}
              >
                <View style={styles.cardTopRow}>
                  <Image
                    source={{ uri: getImageUrl(item.turf?.images?.[0]) || 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=400' }}
                    style={styles.image}
                  />
                  <View style={styles.cardInfo}>
                    <Text style={[styles.turfName, { color: C.text }]} numberOfLines={1}>{item.turf?.name}</Text>
                    {!!address && (
                      <View style={styles.metaRow}>
                        <Icon name="location" size={13} color={C.primary} />
                        <Text style={[styles.metaText, { color: C.subtext }]} numberOfLines={1}>{address}</Text>
                      </View>
                    )}
                    {distanceKm != null && (
                      <View style={styles.metaRow}>
                        <Icon name="walk" size={13} color={C.primary} />
                        <Text style={[styles.metaText, { color: C.subtext }]}>{distanceKm} Km away</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={[styles.divider, { backgroundColor: C.border }]} />

                {status === 'completed' ? (
                  item.reviewed ? (
                    <View style={[styles.actionBox, { backgroundColor: C.bgSoft }]}>
                      <Text style={[styles.reviewedText, { color: C.subtext }]}>Reviewed ✓</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBox, { backgroundColor: C.primary }]}
                      onPress={() => setReviewTarget(item)}
                    >
                      <Text style={styles.rateBtnText}>Rate your Experience</Text>
                    </TouchableOpacity>
                  )
                ) : (
                  <View style={[styles.priceDurationBox, { backgroundColor: C.primary }]}>
                    <View>
                      <Text style={styles.pdLabel}>PRICE</Text>
                      <View style={styles.priceRow}>
                        <Text style={styles.priceValue}>₹{item.turf?.pricePerHour ?? item.totalAmount}</Text>
                        <Text style={styles.priceUnit}>/hr</Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.pdLabel}>DURATION</Text>
                      <Text style={styles.durationValue}>{formatDuration(item.startTime, item.endTime)}</Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      </SafeAreaView>

      <RateReviewModal
        visible={!!reviewTarget}
        turfName={reviewTarget?.turf?.name || ''}
        onCancel={() => setReviewTarget(null)}
        onSubmit={handleSubmitReview}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
                 paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, marginBottom: SPACING.lg },
  backBtn:     { width: 44, height: 44, borderRadius: 22, borderWidth: 1,
                 justifyContent: 'center', alignItems: 'center' },
  title:       { ...FONT.h1, fontSize: 24, fontWeight: '800' },

  tabRow:      { flexDirection: 'row', paddingHorizontal: SPACING.lg },
  tabItem:     { flex: 1, alignItems: 'center', paddingBottom: SPACING.sm },
  tabText:     { fontSize: 16, fontWeight: '600' },
  tabTextActive: { fontWeight: '800' },
  tabUnderline:{ height: 3, borderRadius: 2, width: '80%', marginTop: SPACING.sm },
  tabDivider:  { height: 1, marginBottom: SPACING.lg },

  card:        { borderRadius: RADIUS.xl, padding: SPACING.lg,
                 shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
                 elevation: 2 },
  cardTopRow:  { flexDirection: 'row', gap: SPACING.md },
  image:       { width: 90, height: 90, borderRadius: RADIUS.lg },
  cardInfo:    { flex: 1, justifyContent: 'center', gap: 6 },
  turfName:    { fontWeight: '800', fontSize: 18 },
  metaRow:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText:    { fontSize: 13, flexShrink: 1 },

  divider:     { height: 1, marginVertical: SPACING.md },

  actionBox:   { paddingVertical: 16, borderRadius: RADIUS.lg, alignItems: 'center' },
  rateBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  reviewedText:{ fontWeight: '700', fontSize: 15 },

  priceDurationBox: { flexDirection: 'row', justifyContent: 'space-between',
                      borderRadius: RADIUS.lg, padding: SPACING.lg },
  pdLabel:     { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  priceRow:    { flexDirection: 'row', alignItems: 'flex-end', gap: 4, marginTop: 4 },
  priceValue:  { color: '#fff', fontSize: 22, fontWeight: '800' },
  priceUnit:   { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginBottom: 3 },
  durationValue:{ color: '#fff', fontSize: 15, fontWeight: '700', marginTop: 4 },

  empty:       { alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: SPACING.md },
  emptyText:   { fontSize: 14 },
});