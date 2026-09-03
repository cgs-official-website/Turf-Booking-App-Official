import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Share, Alert, ActivityIndicator,
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { bookingsApi } from '../api/bookings';
import useTheme from '../hooks/useTheme';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { RatingBadge, StatusBadge } from '../components/RatingBadge';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
};

export default function BookingDetailScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const { C, dark } = useTheme();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await bookingsApi.getBooking(bookingId);
        setBooking(res.booking);
      } catch (e) {
        Alert.alert('Error', 'Could not load booking details');
      } finally {
        setLoading(false);
      }
    })();
  }, [bookingId]);

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={[styles.loading, { backgroundColor: C.bg }]}>
        <Feather name="alert-circle" size={48} color={C.primary} />
        <Text style={{ color: C.text, marginTop: 12 }}>Booking not found</Text>
      </View>
    );
  }

  const total     = booking.totalAmount   || 0;
  const players   = Number(booking.players) > 0 ? Number(booking.players) : 1;
  const perPerson = players > 1 ? Math.round(total / players) : total;
  const displayId = `#${(booking._id || '').slice(-6).toUpperCase()}`;
  const isPaid    = booking.paymentStatus === 'paid';
  const status    = booking.status;

  const handleShare = async () => {
    await Share.share({
      message: `Booking Pass for ${booking.turf?.name}!\nDate: ${fmtDate(booking.date)}\nTime: ${booking.startTime} - ${booking.endTime}\nBooking ID: ${displayId}\nTotal: ₹${total} Paid\n\nBooked on Namma Ooru Turf`,
    });
  };

  return (
    <View style={[styles.root, { backgroundColor: C.bg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.navigate('Main')}
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={18} color={C.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: C.text }]}>Digital Booking Pass</Text>
        <TouchableOpacity onPress={handleShare} activeOpacity={0.7}>
          <Feather name="share-2" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* Stadium Ticket Pass */}
        <View style={[styles.ticketCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.card]}>
          {/* Ticket Header */}
          <View style={[styles.ticketHeader, { backgroundColor: C.primary }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.ticketBadge}>OFFICIAL MATCH PASS</Text>
              <Text style={styles.ticketTurfName} numberOfLines={1}>
                {booking.turf?.name || 'Turf Stadium'}
              </Text>
              <Text style={styles.ticketAddress} numberOfLines={1}>
                {booking.turf?.location?.address || 'Court 1'}
              </Text>
            </View>
            <View style={styles.ticketIdBadge}>
              <Text style={styles.ticketIdText}>{displayId}</Text>
            </View>
          </View>

          {/* Ticket Body Details */}
          <View style={styles.ticketBody}>
            <View style={styles.ticketRow}>
              <View style={styles.ticketCol}>
                <Text style={[styles.ticketLabel, { color: C.subtext }]}>GAME DATE</Text>
                <Text style={[styles.ticketVal, { color: C.text }]}>{fmtDate(booking.date)}</Text>
              </View>
              <View style={styles.ticketCol}>
                <Text style={[styles.ticketLabel, { color: C.subtext }]}>TIME SLOT</Text>
                <Text style={[styles.ticketVal, { color: C.primary, fontWeight: '800' }]}>
                  {booking.startTime} - {booking.endTime}
                </Text>
              </View>
            </View>

            <View style={[styles.ticketRow, { marginTop: 14 }]}>
              <View style={styles.ticketCol}>
                <Text style={[styles.ticketLabel, { color: C.subtext }]}>SPORT</Text>
                <Text style={[styles.ticketVal, { color: C.text }]}>{booking.sport || 'Football'}</Text>
              </View>
              <View style={styles.ticketCol}>
                <Text style={[styles.ticketLabel, { color: C.subtext }]}>STATUS</Text>
                <StatusBadge status={status} />
              </View>
            </View>

            {/* Simulated QR Code / Barcode Display */}
            <View style={[styles.qrArea, { backgroundColor: C.bgSoft, borderColor: C.border }]}>
              <Feather name="maximize" size={32} color={C.primary} style={{ marginBottom: 6 }} />
              <Text style={[styles.qrCodeText, { color: C.text }]}>SCAN AT VENUE GATE</Text>
              <Text style={[styles.qrSub, { color: C.caption }]}>{booking._id || 'TURF-PASS-ONLINE'}</Text>
            </View>
          </View>
        </View>

        {/* Payment Summary */}
        <View style={[styles.card, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
          <Text style={[styles.cardTitle, { color: C.text }]}>Payment & Billing</Text>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: C.subtext }]}>Total Amount</Text>
            <Text style={[styles.summaryValue, { color: C.text }]}>₹ {total}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: C.subtext }]}>Payment Mode</Text>
            <Text style={[styles.summaryValue, { color: C.text, fontWeight: '700' }]}>
              {booking.paymentMethod === 'cash' || booking.paymentMode === 'hand_cash'
                ? '💵 Hand Cash (Pay at Ground)'
                : '💳 Online Payment (UPI/Cards)'}
            </Text>
          </View>

          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.summaryLabel, { color: C.subtext }]}>Payment Status</Text>
            <Text style={{ color: isPaid ? '#10B981' : (booking.paymentMethod === 'cash' ? '#F59E0B' : '#EF4444'), fontWeight: '800' }}>
              {isPaid
                ? 'PAID ONLINE'
                : (booking.paymentMethod === 'cash' || booking.paymentMode === 'hand_cash'
                    ? 'PAY ₹' + total + ' AT GROUND'
                    : 'PAYMENT PENDING')}
            </Text>
          </View>
        </View>

        {/* Create Match Community Action */}
        <View style={[styles.matchCard, { backgroundColor: dark ? '#132238' : '#0F172A' }]}>
          <Text style={styles.matchTitle}>Setup Live Cricket Match?</Text>
          <Text style={styles.matchSub}>
            Invite players, run coin toss, and track ball-by-ball scoreboard for this booking.
          </Text>
          <PrimaryButton
            title="Create Match Room →"
            onPress={() => navigation.navigate('CreateMatch', {
              bookingId: booking._id,
              venue: booking.turf?.name,
              sport: booking.sport,
              date: fmtDate(booking.date),
              time: `${booking.startTime} - ${booking.endTime}`,
            })}
            style={{ marginTop: 10, height: 46 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  },
  headerTitle: { ...FONT.h2, fontSize: 18, fontWeight: '800' },
  scroll: { padding: SPACING.lg, paddingBottom: 60, gap: 14 },
  ticketCard: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  ticketHeader: {
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ticketBadge: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  ticketTurfName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 2,
  },
  ticketAddress: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  ticketIdBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  ticketIdText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  ticketBody: {
    padding: 18,
  },
  ticketRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ticketCol: {
    flex: 1,
  },
  ticketLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  ticketVal: {
    fontSize: 14,
    fontWeight: '700',
  },
  qrArea: {
    marginTop: 18,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  qrCodeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  qrSub: {
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    padding: 16,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  cardTitle: {
    ...FONT.h3,
    fontSize: 15,
    fontWeight: '800',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  summaryLabel: { fontSize: 13 },
  summaryValue: { fontSize: 13, fontWeight: '700' },
  matchCard: {
    padding: 18,
    borderRadius: RADIUS.xl,
  },
  matchTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  matchSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, lineHeight: 16, marginBottom: 8 },
});