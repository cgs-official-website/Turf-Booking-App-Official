import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, ActivityIndicator, Image, ScrollView,
} from 'react-native';
import { bookingsApi } from '../api/bookings';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import Icon from 'react-native-vector-icons/Ionicons';

const orangeClock = require('../assets/orangeclock.png');
const redClock    = require('../assets/redclock.png');
const greenClock  = require('../assets/greenclock.png');
const greenBell   = require('../assets/greenbell.png');

const RESPONSE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export default function RequestPendingScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [booking,     setBooking]     = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(RESPONSE_WINDOW_MS / 1000);
  const pollRef  = useRef(null);
  const timerRef = useRef(null);

  // ── Polling: fetch booking every 4s ───────────────────────────────────────
  const fetchBooking = async () => {
    try {
      const res = await bookingsApi.getBooking(bookingId);
      const b = res.booking;
      setBooking(b);

      if (b.status === 'confirmed') {
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        navigation.replace('BookingDetail', { bookingId });
      } else if (['rejected', 'cancelled'].includes(b.status)) {
        clearInterval(pollRef.current);
        clearInterval(timerRef.current);
        setSecondsLeft(0);
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchBooking();
    pollRef.current = setInterval(fetchBooking, 4000);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  // ── Countdown timer: starts from booking createdAt + 10 mins ──────────────
  useEffect(() => {
    if (!booking?.createdAt) return;
    clearInterval(timerRef.current);

    const deadline = new Date(booking.createdAt).getTime() + RESPONSE_WINDOW_MS;

    const tick = () => {
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(diff);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [booking?.createdAt]);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (!booking) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  // ── Derived state ──────────────────────────────────────────────────────────
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  const isPending   = booking.status === 'pending';
  const isRejected  = booking.status === 'rejected';
  const isCancelled = booking.status === 'cancelled';
  const isExpired   = isPending && secondsLeft === 0;
  const isBad       = isRejected || isCancelled || isExpired;

  // Status card colours + icon asset
  const cardBg      = isBad ? COLORS.redBg : COLORS.orangeBg;
  const statusClock = isBad ? redClock : orangeClock;

  const statusTitle = isPending && !isExpired
    ? 'Request Pending'
    : isRejected  ? 'Request Declined'
    : isCancelled ? 'Booking Cancelled'
    : 'Request Expired';

  const statusSub = isPending && !isExpired
    ? 'Waiting for vendor confirmation'
    : isRejected
    ? (booking.rejectionReason || 'Vendor declined this request')
    : isCancelled
    ? 'This booking was cancelled'
    : 'Vendor did not respond in time';

  // Timer colours + icon asset
  const timerCircleBg   = isExpired ? COLORS.redBg    : COLORS.greenSoft;
  const timerClockAsset = isExpired ? redClock        : greenClock;
  const timerValueColor = isExpired ? COLORS.red      : COLORS.text;

  // Call now: enabled only when timer expired or rejected/cancelled
  const callEnabled = isExpired || isRejected || isCancelled;

  // Phone number from vendor (populate vendor on turf)
  const vendorPhone = booking.turf?.vendor?.phone || booking.vendorPhone;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request Pending</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 40 }}>

        {/* ── Status Card ── */}
        <View style={[styles.statusCard, { backgroundColor: cardBg }]}>
          <View style={styles.statusIconCircle}>
            <Image source={statusClock} style={styles.statusIconImg} resizeMode="contain" />
          </View>
          <View style={styles.statusTextCol}>
            <Text style={styles.statusTitle}>{statusTitle}</Text>
            <Text style={styles.statusSub}>{statusSub}</Text>
            <View style={styles.codeBadge}>
              <Icon name="ticket-outline" size={14} color="#fff" />
              <Text style={styles.codeText}>
                Booking ID: {booking._id?.slice(-6).toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Timer Card ── */}
        <View style={styles.timerCard}>
          <View style={styles.timerRow}>
            <View style={[styles.timerIconCircle, { backgroundColor: timerCircleBg }]}>
              <Image source={timerClockAsset} style={styles.timerIconImg} resizeMode="contain" />
            </View>
            <View>
              <Text style={styles.timerLabel}>Response expected within</Text>
              <Text style={[styles.timerValue, { color: timerValueColor }]}>
                {mm} : {ss}
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.timerRow}>
            <Image source={greenBell} style={styles.bellIconImg} resizeMode="contain" />
            <Text style={styles.timerHint}>
              We will notify you as soon as the vendor responds
            </Text>
          </View>
        </View>

        {/* ── Booking Details Card ── */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Booking Details</Text>

          <View style={styles.turfRow}>
            {booking.turf?.images?.[0] ? (
              <Image source={{ uri: booking.turf.images[0] }} style={styles.turfThumb} />
            ) : (
              <View style={[styles.turfThumb, { backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="image-outline" size={24} color={COLORS.subtext} />
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.turfName}>{booking.turf?.name}</Text>
              <View style={styles.locRow}>
                <Icon name="location-outline" size={13} color={COLORS.primary} />
                <Text style={styles.locText} numberOfLines={1}>
                  {booking.turf?.location?.city}, {booking.turf?.location?.state}, India
                </Text>
              </View>
              <View style={styles.locRow}>
                <Icon name="walk-outline" size={13} color={COLORS.subtext} />
                <Text style={styles.locText}>2.4 Km away</Text>
              </View>
            </View>
          </View>

          {/* Dark price banner */}
          <View style={styles.priceBox}>
            <View>
              <Text style={styles.priceLabel}>PRICE</Text>
              <Text style={styles.priceValue}>
                ₹{booking.turf?.pricePerHour}
                <Text style={styles.priceUnit}>/hr</Text>
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View>
              <Text style={styles.priceLabel}>DURATION</Text>
              <Text style={styles.durationValue}>
                {booking.startTime} - {booking.endTime}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Call Now ── */}
        <TouchableOpacity
          style={[styles.callBtn, callEnabled && styles.callBtnActive]}
          disabled={!callEnabled}
          onPress={() => {
            if (vendorPhone) Linking.openURL(`tel:${vendorPhone}`);
          }}
        >
          <Icon name="call" size={18} color="#fff" />
          <Text style={styles.callBtnText}>Call now</Text>
        </TouchableOpacity>

        {/* ── Try Another Slot (only on bad status) ── */}
        {isBad && (
          <TouchableOpacity
            style={styles.tryAgainBtn}
            onPress={() => navigation.navigate('TurfDetail', { id: booking.turf?._id })}
          >
            <Text style={styles.tryAgainText}>Try Another Slot</Text>
          </TouchableOpacity>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: COLORS.bg },
  loadingBox:       { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header:           { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  backBtn:          { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  headerTitle:      { ...FONT.h3, color: COLORS.text, fontWeight: '700' },

  // Status Card
  statusCard:       { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.lg, padding: SPACING.lg, gap: SPACING.md, marginBottom: SPACING.lg },
  statusIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
  statusIconImg:    { width: 40, height: 40 },
  statusTextCol:    { flex: 1 },
  statusTitle:      { fontSize: 19, fontWeight: '800', color: COLORS.text },
  statusSub:        { color: COLORS.subtext, fontSize: 13, marginTop: 2 },
  codeBadge:        { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, backgroundColor: COLORS.primaryDark, paddingHorizontal: SPACING.md, paddingVertical: 6, borderRadius: RADIUS.round, marginTop: SPACING.md },
  codeText:         { color: '#fff', fontSize: 12, fontWeight: '700' },

  // Timer Card
  timerCard:        { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, backgroundColor: '#fff' },
  timerRow:         { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  timerIconCircle:  { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
  timerIconImg:     { width: 22, height: 22 },
  bellIconImg:      { width: 18, height: 18 },
  timerLabel:       { color: COLORS.subtext, fontSize: 12 },
  timerValue:       { fontSize: 28, fontWeight: '800', letterSpacing: 1 },
  divider:          { height: 1, backgroundColor: COLORS.border, marginVertical: SPACING.md },
  timerHint:        { color: COLORS.subtext, fontSize: 12, flex: 1 },

  // Details Card
  detailsCard:      { borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, padding: SPACING.lg, marginBottom: SPACING.lg, backgroundColor: '#fff' },
  detailsTitle:     { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: SPACING.md },
  turfRow:          { flexDirection: 'row', gap: SPACING.md, alignItems: 'center', marginBottom: SPACING.md },
  turfThumb:        { width: 70, height: 70, borderRadius: RADIUS.md },
  turfName:         { fontWeight: '700', color: COLORS.text, fontSize: 15 },
  locRow:           { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locText:          { color: COLORS.subtext, fontSize: 12, flexShrink: 1 },

  // Price banner
  priceBox:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: COLORS.primaryDark, borderRadius: RADIUS.md, padding: SPACING.md, marginTop: SPACING.sm },
  priceDivider:     { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },
  priceLabel:       { color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 1, fontWeight: '600' },
  priceValue:       { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 2 },
  priceUnit:        { fontSize: 12, fontWeight: '400' },
  durationValue:    { color: '#fff', fontSize: 14, fontWeight: '700', marginTop: 2 },

  // Buttons
  callBtn:          { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, backgroundColor: COLORS.subtext, paddingVertical: SPACING.lg, borderRadius: RADIUS.round, marginBottom: SPACING.md },
  callBtnActive:    { backgroundColor: COLORS.primary },
  callBtnText:      { color: '#fff', fontWeight: '700', fontSize: 15 },
  tryAgainBtn:      { backgroundColor: COLORS.red, paddingVertical: SPACING.lg, borderRadius: RADIUS.lg, alignItems: 'center' },
  tryAgainText:     { color: '#fff', fontWeight: '700' },
});