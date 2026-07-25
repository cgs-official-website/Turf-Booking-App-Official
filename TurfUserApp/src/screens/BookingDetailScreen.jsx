import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Share, Alert, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING, RADIUS, FONT } from '../utils/theme';
import { bookingsApi } from '../api/bookings';

const fmtDate = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'short', year: 'numeric',
  });
};

export default function BookingDetailScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Fetch booking from backend ────────────────────────────────────────────
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
      <View style={styles.loading}>
        <ActivityIndicator color={COLORS.primary} size="large" />
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.loading}>
        <Icon name="alert-circle-outline" size={48} color={COLORS.primary} />
        <Text style={{ color: COLORS.text, marginTop: 12 }}>Booking not found</Text>
      </View>
    );
  }

  const total     = booking.totalAmount   || 0;
  const players   = Number(booking.players) > 0 ? Number(booking.players) : 1;
  const perPerson = players > 1 ? Math.round(total / players) : total;
  const displayId = `#${(booking._id || '').slice(-6).toUpperCase()}`;
  const isPaid    = booking.paymentStatus === 'paid';
  const status    = booking.status;

  // ── Rejected Screen ────────────────────────────────────────────────────────
  if (status === 'rejected') {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
            <Icon name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Status</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[styles.successBanner, { backgroundColor: '#fef2f2' }]}>
            <View style={[styles.successCircle, { backgroundColor: '#ef4444' }]}>
              <Icon name="close" size={34} color="#fff" />
            </View>
            <Text style={[styles.successTitle, { color: '#991b1b' }]}>Booking Rejected</Text>
            <Text style={[styles.successSub, { color: '#b91c1c' }]}>
              {booking.rejectionReason || 'Vendor declined your request'}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="ticket-outline" size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Booking Summary</Text>
            </View>
            {[
              { icon: 'location-outline', label: 'Venue',      value: booking.turf?.name },
              { icon: 'time-outline',     label: 'Time',       value: `${booking.startTime} to ${booking.endTime}` },
              { icon: 'calendar-outline', label: 'Date',       value: fmtDate(booking.date) },
              { icon: 'receipt-outline',  label: 'Booking ID', value: displayId },
            ].map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Icon name={row.icon} size={15} color={COLORS.subtext} />
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                </View>
                <Text style={styles.summaryValue}>{row.value}</Text>
              </View>
            ))}
          </View>

          <View style={[styles.card, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Icon name="information-circle-outline" size={20} color="#ef4444" />
              <Text style={{ color: '#991b1b', fontWeight: '700', fontSize: 14 }}>What's next?</Text>
            </View>
            <Text style={{ color: '#b91c1c', fontSize: 13, marginTop: 8, lineHeight: 20 }}>
              Your slot request was rejected. You can try booking a different time slot or another turf nearby.
            </Text>
            <TouchableOpacity
              style={{ marginTop: 14, backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Find Another Turf</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── Pending Screen ─────────────────────────────────────────────────────────
  if (status === 'pending') {
    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
            <Icon name="arrow-back" size={20} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Booking Status</Text>
          <View style={{ width: 38 }} />
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[styles.successBanner, { backgroundColor: '#fffbeb' }]}>
            <View style={[styles.successCircle, { backgroundColor: '#f59e0b' }]}>
              <Icon name="time-outline" size={34} color="#fff" />
            </View>
            <Text style={[styles.successTitle, { color: '#92400e' }]}>Request Sent</Text>
            <Text style={[styles.successSub, { color: '#b45309' }]}>Waiting for vendor approval</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Icon name="ticket-outline" size={18} color={COLORS.primary} />
              <Text style={styles.cardTitle}>Booking Summary</Text>
            </View>
            {[
              { icon: 'location-outline', label: 'Venue',      value: booking.turf?.name },
              { icon: 'time-outline',     label: 'Time',       value: `${booking.startTime} to ${booking.endTime}` },
              { icon: 'calendar-outline', label: 'Date',       value: fmtDate(booking.date) },
              { icon: 'receipt-outline',  label: 'Booking ID', value: displayId },
            ].map((row) => (
              <View key={row.label} style={styles.summaryRow}>
                <View style={styles.summaryLeft}>
                  <Icon name={row.icon} size={15} color={COLORS.subtext} />
                  <Text style={styles.summaryLabel}>{row.label}</Text>
                </View>
                <Text style={styles.summaryValue}>{row.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    );
  }

  const handleShare = async () => {
    await Share.share({
      message: `🏟️ Booking confirmed at ${booking.turf?.name}!\n📅 ${fmtDate(booking.date)}\n⏰ ${booking.startTime} to ${booking.endTime}\n💰 ₹${perPerson}/person (${players} players)\n\nBooked via Namma Ooru Turf!`,
    });
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backBtn}>
          <Icon name="arrow-back" size={20} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Booking Confirmed</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* ── You're All Set Banner ── */}
        <View style={styles.successBanner}>
          <View style={[styles.dot, styles.dotTL]} />
          <View style={[styles.dot, styles.dotTR]} />
          <View style={[styles.dot, styles.dotBL]} />
          <View style={[styles.dot, styles.dotBR]} />
          <View style={styles.successCircle}>
            <Icon name="checkmark" size={34} color="#fff" />
          </View>
          <Text style={styles.successTitle}>You're All Set!</Text>
          <Text style={styles.successSub}>Your slot has been confirmed</Text>
        </View>

        {/* ── Booking Summary ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="ticket-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Booking Summary</Text>
          </View>

          {[
            { icon: 'location-outline', label: 'Venue',      value: booking.turf?.name },
            { icon: 'time-outline',      label: 'Time',       value: `${booking.startTime} to ${booking.endTime}` },
            { icon: 'calendar-outline',  label: 'Date',       value: fmtDate(booking.date) },
            { icon: 'receipt-outline',   label: 'Booking ID', value: displayId },
            { icon: 'people-outline',    label: 'Players',    value: `${players} Player${players > 1 ? 's' : ''}` },
          ].map((row) => (
            <View key={row.label} style={styles.summaryRow}>
              <View style={styles.summaryLeft}>
                <Icon name={row.icon} size={15} color={COLORS.subtext} />
                <Text style={styles.summaryLabel}>{row.label}</Text>
              </View>
              <Text style={styles.summaryValue}>{row.value}</Text>
            </View>
          ))}
        </View>

        {/* ── Payment Details ── */}
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <Icon name="card-outline" size={18} color={COLORS.primary} />
            <Text style={styles.cardTitle}>Payment Details</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Amount</Text>
            <Text style={styles.summaryValue}>₹ {total}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Split Among</Text>
            <Text style={styles.summaryValue}>{players} Players</Text>
          </View>

          <View style={styles.perPersonRow}>
            <Text style={styles.perPersonLabel}>Per Person</Text>
            <Text style={styles.perPersonValue}>₹ {perPerson}</Text>
          </View>

          {/* Payment status badge */}
          {isPaid ? (
            <View style={styles.paidBadge}>
              <Icon name="checkmark-circle" size={16} color={COLORS.primary} />
              <Text style={styles.paidText}>Payment Successful</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Icon name="time-outline" size={16} color="#f59e0b" />
              <Text style={styles.pendingText}>Payment Pending</Text>
            </View>
          )}
        </View>

        {/* ── Share ── */}
        <TouchableOpacity style={styles.shareRow} onPress={handleShare}>
          <View style={styles.shareLeft}>
            <View style={styles.shareIconCircle}>
              <Icon name="checkmark-circle-outline" size={22} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.shareTitle}>Booking confirmed</Text>
              <Text style={styles.shareSub}>Share your booking details</Text>
            </View>
          </View>
          <Icon name="share-social-outline" size={20} color={COLORS.primary} />
        </TouchableOpacity>

        {/* ── Create a Match ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Create a Match ?</Text>
          <Text style={styles.createMatchSub}>Set up teams and invite players for this bookings</Text>
          <View style={styles.createMatchRow}>
            <TouchableOpacity
              style={styles.laterBtn}
              onPress={() => navigation.navigate('Main')}
            >
              <Text style={styles.laterText}>Later</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.createMatchBtn}
              onPress={() => navigation.navigate('CreateMatch', {
                bookingId: booking._id,
                venue: booking.turf?.name,
                sport: booking.sport,
                date: fmtDate(booking.date),
                time: `${booking.startTime} - ${booking.endTime}`,
              })}
            >
              <Text style={styles.createMatchText}>Create Match</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:            { flex: 1, backgroundColor: COLORS.bg },
  loading:         { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Header
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.lg, paddingTop: 50, paddingBottom: SPACING.md },
  backBtn:         { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.bgSoft, justifyContent: 'center', alignItems: 'center' },
  headerTitle:     { ...FONT.h3, color: COLORS.text },

  // Success Banner
  successBanner:   { backgroundColor: COLORS.greenSoft, margin: SPACING.lg, borderRadius: RADIUS.xl, paddingVertical: SPACING.xl, alignItems: 'center', overflow: 'hidden', position: 'relative' },
  successCircle:   { width: 68, height: 68, borderRadius: 34, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.md },
  successTitle:    { fontSize: 22, fontWeight: '800', color: COLORS.text },
  successSub:      { color: COLORS.subtext, fontSize: 13, marginTop: 4 },
  dot:             { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary, opacity: 0.25 },
  dotTL:           { top: 18, left: 28 },
  dotTR:           { top: 12, right: 40 },
  dotBL:           { bottom: 20, left: 60 },
  dotBR:           { bottom: 14, right: 24 },

  // Card
  card:            { backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  cardHeaderRow:   { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md },
  cardTitle:       { fontSize: 15, fontWeight: '700', color: COLORS.text },

  // Summary rows
  summaryRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  summaryLeft:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel:    { color: COLORS.subtext, fontSize: 13 },
  summaryValue:    { fontWeight: '700', color: COLORS.text, fontSize: 13 },

  // Per person
  perPersonRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: COLORS.greenSoft, borderRadius: RADIUS.md, paddingHorizontal: SPACING.md, paddingVertical: 12, marginTop: SPACING.sm },
  perPersonLabel:  { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  perPersonValue:  { fontWeight: '800', color: COLORS.primary, fontSize: 16 },

  // Badges
  paidBadge:       { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.greenSoft, borderRadius: RADIUS.round, paddingHorizontal: SPACING.md, paddingVertical: 6, alignSelf: 'flex-start', marginTop: SPACING.md },
  paidText:        { color: COLORS.primary, fontSize: 12, fontWeight: '700' },
  pendingBadge:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fef3c7', borderRadius: RADIUS.round, paddingHorizontal: SPACING.md, paddingVertical: 6, alignSelf: 'flex-start', marginTop: SPACING.md },
  pendingText:     { color: '#92400e', fontSize: 12, fontWeight: '700' },

  // Share
  shareRow:        { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', marginHorizontal: SPACING.lg, marginBottom: SPACING.md, borderRadius: RADIUS.xl, padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border },
  shareLeft:       { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  shareIconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.greenSoft, justifyContent: 'center', alignItems: 'center' },
  shareTitle:      { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  shareSub:        { color: COLORS.subtext, fontSize: 12, marginTop: 2 },

  // Create a Match
  createMatchSub:  { color: COLORS.subtext, fontSize: 12, marginTop: 2, marginBottom: SPACING.md },
  createMatchRow:  { flexDirection: 'row', gap: SPACING.md },
  laterBtn:        { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: RADIUS.lg, paddingVertical: 13, alignItems: 'center' },
  laterText:       { fontWeight: '700', color: COLORS.text, fontSize: 14 },
  createMatchBtn:  { flex: 1.4, backgroundColor: COLORS.primary, borderRadius: RADIUS.lg, paddingVertical: 13, alignItems: 'center' },
  createMatchText: { fontWeight: '800', color: '#fff', fontSize: 14 },
});