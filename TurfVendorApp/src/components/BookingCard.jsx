import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

const STATUS_CONFIG = {
  pending:   { bg: '#F59E0B', label: 'Pending'  },
  confirmed: { bg: '#10B981', label: 'Accepted' },
  rejected:  { bg: '#EF4444', label: 'Rejected' },
  cancelled: { bg: '#9CA3AF', label: 'Cancelled' },
};

const shortId = (id = '') => id.slice(-6).toUpperCase();

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
};

const BookingCard = ({ booking, onPress, onAccept, onReject }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed';

  const handleCall = () => {
    const phone = booking.user?.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <TouchableOpacity style={[styles.card, SHADOWS.sm]} onPress={onPress} activeOpacity={0.85}>
      {/* Req id + status pill */}
      <View style={styles.topRow}>
        <Text style={styles.reqId}>Req - {shortId(booking._id)}</Text>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={styles.badgeText}>{cfg.label}</Text>
        </View>
      </View>

      {/* User + turf */}
      <Text style={styles.userName}>{booking.user?.name || 'User'}</Text>
      <Text style={styles.turfName}>{booking.turf?.name || 'Turf'}</Text>

      {/* Date / game / players */}
      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Ionicons name="calendar-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText}>{formatDate(booking.date)}</Text>
        </View>
        {!!booking.gameType && (
          <View style={styles.metaItem}>
            <Ionicons name="football-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{booking.gameType}</Text>
          </View>
        )}
        {!!booking.playerCount && (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={13} color={colors.textSecondary} />
            <Text style={styles.metaText}>{booking.playerCount} Players</Text>
          </View>
        )}
      </View>

      {/* Time */}
      <View style={styles.timeRow}>
        <Ionicons name="time-outline" size={13} color={colors.textSecondary} />
        <Text style={styles.timeText}>{booking.startTime} To {booking.endTime}</Text>
      </View>

      {/* Total */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>₹{booking.totalAmount}</Text>
      </View>

      {/* Actions */}
      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} activeOpacity={0.85}>
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}

      {isConfirmed && (
        <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
          <Ionicons name="call-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.callText}>Call now</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// Status pill colors (cfg.bg above) and the white text/icons that sit on
// solid-color buttons (accept/reject/call) stay as fixed literals on
// purpose — they're foreground content on an always-colored surface, not
// something that should invert with the theme.
const getStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  reqId: { fontSize: SIZES.sm, fontWeight: '700', color: colors.primaryDark },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: SIZES.xs, fontWeight: '700', color: '#FFFFFF' },
  userName: { fontSize: SIZES.lg, fontWeight: '700', color: colors.text },
  turfName: { fontSize: SIZES.sm, color: colors.textSecondary, marginTop: 2, marginBottom: 10 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 14, rowGap: 4, marginBottom: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: SIZES.sm, color: colors.textSecondary },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  timeText: { fontSize: SIZES.sm, color: colors.textSecondary },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: SIZES.base, color: colors.textSecondary, fontWeight: '600' },
  totalValue: { fontSize: SIZES.lg, color: colors.text, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  rejectBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 24,
    backgroundColor: colors.error, alignItems: 'center',
  },
  rejectText: { color: '#FFFFFF', fontWeight: '700', fontSize: SIZES.md },
  acceptBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center',
  },
  acceptText: { color: '#FFFFFF', fontWeight: '700', fontSize: SIZES.md },
  callBtn: {
    marginTop: 14, paddingVertical: 12, borderRadius: 24,
    backgroundColor: colors.primary, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center',
  },
  callText: { color: '#FFFFFF', fontWeight: '700', fontSize: SIZES.md },
});

export default BookingCard;