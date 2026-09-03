import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Linking, ActivityIndicator, ScrollView, StatusBar,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { bookingsApi } from '../api/bookings';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';

const RESPONSE_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export default function RequestPendingScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { C, dark } = useTheme();
  const [booking,     setBooking]     = useState(null);
  const [secondsLeft, setSecondsLeft] = useState(600);
  const pollRef  = useRef(null);
  const timerRef = useRef(null);

  const parseDateMs = (d) => {
    if (!d) return Date.now();
    if (typeof d === 'number') return d;
    if (d._seconds) return d._seconds * 1000;
    if (typeof d.toDate === 'function') return d.toDate().getTime();
    const t = new Date(d).getTime();
    return isNaN(t) ? Date.now() : t;
  };

  const fetchBooking = async () => {
    try {
      const res = await bookingsApi.getBooking(bookingId);
      const b = res.booking || res.data?.booking || res;
      if (b) {
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
      }
    } catch (e) {
      console.warn('Polling error on pending booking:', e.message);
    }
  };

  useEffect(() => {
    fetchBooking();
    pollRef.current = setInterval(fetchBooking, 3500);
    return () => {
      clearInterval(pollRef.current);
      clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!booking) return;
    clearInterval(timerRef.current);
    const createdMs = parseDateMs(booking.requestedAt || booking.createdAt || booking.reservedAt);
    const deadline = createdMs + RESPONSE_WINDOW_MS;

    const tick = () => {
      const diff = Math.max(0, Math.floor((deadline - Date.now()) / 1000));
      setSecondsLeft(isNaN(diff) ? 600 : diff);
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [booking?.requestedAt, booking?.createdAt, booking?.reservedAt]);

  if (!booking) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={[styles.loadingText, { color: C.subtext }]}>Loading booking status...</Text>
      </View>
    );
  }

  const validSeconds = typeof secondsLeft === 'number' && !isNaN(secondsLeft) ? secondsLeft : 600;
  const mm = String(Math.floor(validSeconds / 60)).padStart(2, '0');
  const ss = String(validSeconds % 60).padStart(2, '0');

  const isPending   = booking.status === 'pending' || booking.status === 'reserved';
  const isRejected  = booking.status === 'rejected';
  const isCancelled = booking.status === 'cancelled';
  const isExpired   = isPending && validSeconds === 0;

  const turfName    = booking.turfName || booking.turf?.name || 'Turf Pitch Arena';
  const turfAddress = booking.turfAddress || booking.turf?.address || booking.turf?.location?.address || `${booking.turf?.city || 'Tamil Nadu'}`;
  const totalAmount = booking.amount || booking.totalAmount || 800;
  const vendorPhone = booking.turf?.vendor?.phone || booking.vendorPhone;

  const fmtDate = (d) => {
    if (!d) return 'Today';
    const dateObj = new Date(d);
    if (isNaN(dateObj.getTime())) return String(d);
    return dateObj.toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main')}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="home" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Booking Status</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Status Banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: isRejected || isCancelled || isExpired
                ? (dark ? '#3D1414' : '#FEE2E2')
                : (dark ? '#1A2E20' : '#ECFDF5'),
              borderColor: isRejected || isCancelled || isExpired
                ? '#EF4444'
                : '#10B981',
            },
          ]}
        >
          <View
            style={[
              styles.statusIconWrap,
              {
                backgroundColor: isRejected || isCancelled || isExpired
                  ? '#EF4444'
                  : '#10B981',
              },
            ]}
          >
            <Feather
              name={isRejected || isCancelled || isExpired ? 'alert-circle' : 'clock'}
              size={24}
              color="#FFFFFF"
            />
          </View>

          <Text
            style={[
              styles.statusTitle,
              {
                color: isRejected || isCancelled || isExpired
                  ? '#DC2626'
                  : '#059669',
              },
            ]}
          >
            {isPending && !isExpired
              ? 'Hand Cash Request Placed ⏳'
              : isRejected
              ? 'Request Declined by Venue'
              : isCancelled
              ? 'Booking Cancelled'
              : 'Hold Window Expired'}
          </Text>

          <Text style={[styles.statusSub, { color: C.subtext }]}>
            {isPending && !isExpired
              ? 'The venue manager has received your booking request and will confirm shortly.'
              : isRejected
              ? (booking.rejectionReason || 'The selected slot was filled.')
              : 'Please select another available time slot or pitch.'}
          </Text>
        </View>

        {/* Live Timer Countdown */}
        {isPending && !isExpired && (
          <View style={[styles.timerCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
            <Text style={[styles.timerLabel, { color: C.subtext }]}>Manager Acceptance Window</Text>
            <Text style={[styles.timerNumbers, { color: C.primary }]}>
              {mm}:{ss}
            </Text>
            <Text style={[styles.timerDesc, { color: C.caption }]}>
              Auto-syncing in real time. You will be redirected instantly when accepted.
            </Text>
          </View>
        )}

        {/* Booking Details Card (Venue, Location, Time, Payment) */}
        <View style={[styles.summaryBox, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <Text style={[styles.summaryTitle, { color: C.text }]}>Venue & Slot Details</Text>

          {/* Venue Name */}
          <View style={styles.summaryItem}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Feather name="shield" size={14} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryKey, { color: C.subtext }]}>Venue Name</Text>
              <Text style={[styles.summaryVal, { color: C.text, fontWeight: '800' }]}>{turfName}</Text>
            </View>
          </View>

          {/* Venue Location Address */}
          <View style={styles.summaryItem}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
              <Feather name="map-pin" size={14} color="#3B82F6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryKey, { color: C.subtext }]}>Location</Text>
              <Text style={[styles.summaryVal, { color: C.text }]} numberOfLines={2}>{turfAddress}</Text>
            </View>
          </View>

          {/* Schedule Date */}
          <View style={styles.summaryItem}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
              <Feather name="calendar" size={14} color="#F59E0B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryKey, { color: C.subtext }]}>Match Date</Text>
              <Text style={[styles.summaryVal, { color: C.text }]}>{fmtDate(booking.date)}</Text>
            </View>
          </View>

          {/* Slot Duration */}
          <View style={styles.summaryItem}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(236, 72, 153, 0.12)' }]}>
              <Feather name="clock" size={14} color="#EC4899" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryKey, { color: C.subtext }]}>Slot Timing</Text>
              <Text style={[styles.summaryVal, { color: C.primary, fontWeight: '800' }]}>
                {booking.startTime} - {booking.endTime}
              </Text>
            </View>
          </View>

          {/* Payment Mode */}
          <View style={styles.summaryItem}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Ionicons name="cash-outline" size={16} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryKey, { color: C.subtext }]}>Payment Mode</Text>
              <Text style={[styles.summaryVal, { color: C.text, fontWeight: '700' }]}>
                {booking.paymentMethod === 'cash' || booking.paymentMode === 'hand_cash'
                  ? '💵 Hand Cash (Pay at Venue)'
                  : '💳 Online Payment'}
              </Text>
            </View>
          </View>

          {/* Total Amount */}
          <View style={[styles.summaryItem, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
              <Feather name="tag" size={14} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.summaryKey, { color: C.subtext }]}>Total Amount Payable</Text>
              <Text style={[styles.summaryVal, { color: C.primary, fontSize: 18, fontWeight: '900' }]}>
                ₹{totalAmount}
              </Text>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        {vendorPhone && (
          <SecondaryButton
            title="Call Venue Manager"
            icon={<Feather name="phone-call" size={16} color={C.primary} />}
            onPress={() => Linking.openURL(`tel:${vendorPhone}`)}
            style={{ marginTop: 6 }}
          />
        )}

        <PrimaryButton
          title="Return to Home Dashboard"
          onPress={() => navigation.navigate('Main')}
          style={{ marginTop: 10 }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '600' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingTop: 52,
    paddingBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerTitle: {
    ...FONT.h2,
    fontSize: 18,
    fontWeight: '800',
  },
  scroll: {
    padding: SPACING.lg,
    paddingBottom: 100,
    gap: 14,
  },
  statusBanner: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  statusIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 4,
    textAlign: 'center',
  },
  statusSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  timerCard: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  timerNumbers: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 2,
    marginVertical: 4,
  },
  timerDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  summaryBox: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 14,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  summaryKey: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});