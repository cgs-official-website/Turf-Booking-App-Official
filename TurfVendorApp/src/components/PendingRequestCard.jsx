import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { acceptBooking } from '../redux/vendorSlice';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// "Requested Xm ago" instead of a countdown — there's no backend field for
// a response deadline, so a ticking countdown would be fabricated. This
// still conveys urgency honestly, using the real booking creation time.
const timeAgo = (createdAt) => {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const mins = Math.max(0, Math.floor(diffMs / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const PendingRequestCard = ({ booking, onAccepted }) => {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const [busy, setBusy] = useState(false);
  const [, forceTick] = useState(0);

  // Re-render once a minute so "Xm ago" stays accurate without a fake timer.
  useEffect(() => {
    const t = setInterval(() => forceTick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);

  const handleAccept = async () => {
    setBusy(true);
    try {
      await dispatch(acceptBooking(booking._id)).unwrap();
      onAccepted?.();
    } catch (e) {
      Alert.alert('Could not accept', e || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const handleContact = () => {
    const phone = booking.user?.phone;
    if (!phone) {
      Alert.alert('No phone number', "This player hasn't shared a contact number.");
      return;
    }
    Linking.openURL(`tel:${phone}`);
  };

  return (
    <View style={[styles.card, SHADOWS.md]}>
      <View style={styles.topRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>NEW REQUEST</Text>
        </View>
        <View style={styles.timeBadge}>
          <Icon name="clock" size={12} color="rgba(255,255,255,0.6)" />
          <Text style={styles.timeText}>{timeAgo(booking.createdAt)}</Text>
        </View>
      </View>

      <Text style={styles.name} numberOfLines={1}>{booking.user?.name || 'Player'}</Text>

      <View style={styles.metaRow}>
        <View style={styles.metaChip}>
          <Icon name="calendar" size={13} color={colors.primary} />
          <Text style={styles.metaText}>{formatDate(booking.date)}</Text>
        </View>
        {!!booking.sport && (
          <View style={styles.metaChip}>
            <Icon name="activity" size={13} color={colors.primary} />
            <Text style={styles.metaText}>{booking.sport}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoBox}>
        <View>
          <Text style={styles.infoLabel}>PRICE</Text>
          <Text style={styles.infoValue}>
            ₹{booking.totalAmount} <Text style={styles.infoUnit}>/hr</Text>
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.infoLabel}>DURATION</Text>
          <Text style={styles.infoValueSm}>{booking.startTime} - {booking.endTime}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={busy} activeOpacity={0.85}>
          <Icon name="check" size={16} color="#FFFFFF" />
          <Text style={styles.acceptText}>{busy ? 'Accepting…' : 'Accept'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.contactBtn} onPress={handleContact} activeOpacity={0.85}>
          <Icon name="phone" size={16} color="#FFFFFF" />
          <Text style={styles.contactText}>Contact</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// Note: this card is always a dark "hero" surface (colors.secondary) in both
// app themes by design, so its internal text stays white/rgba-white on
// purpose — only colors.* values that vary by theme (primary, error, white,
// secondary) are pulled from the theme.
const getStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.secondary,
    borderRadius: SIZES.radiusLg,
    padding: 20,
    marginBottom: 20,
  },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  badge: { backgroundColor: 'rgba(0,197,102,0.18)', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { color: colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  timeBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { color: 'rgba(255,255,255,0.6)', fontSize: SIZES.xs, marginLeft: 4 },
  name: { color: '#FFFFFF', fontSize: SIZES.xxl, fontWeight: '800', marginBottom: 12 },
  metaRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,197,102,0.14)',
    borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, gap: 6,
  },
  metaText: { color: 'rgba(255,255,255,0.85)', fontSize: SIZES.sm, marginLeft: 6, fontWeight: '600' },
  infoBox: {
    flexDirection: 'row', justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: SIZES.radius, padding: 14, marginBottom: 18,
  },
  infoLabel: { color: 'rgba(255,255,255,0.45)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { color: '#FFFFFF', fontSize: SIZES.xxl, fontWeight: '800' },
  infoUnit: { fontSize: SIZES.sm, fontWeight: '500', color: 'rgba(255,255,255,0.6)' },
  infoValueSm: { color: '#FFFFFF', fontSize: SIZES.base, fontWeight: '700' },
  actionsRow: { flexDirection: 'row', gap: 10 },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: SIZES.radius, paddingVertical: 13,
  },
  acceptText: { color: '#FFFFFF', fontWeight: '700', fontSize: SIZES.base, marginLeft: 6 },
  contactBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: SIZES.radius, paddingVertical: 13,
  },
  contactText: { color: '#FFFFFF', fontWeight: '700', fontSize: SIZES.base, marginLeft: 6 },
});

export default PendingRequestCard;