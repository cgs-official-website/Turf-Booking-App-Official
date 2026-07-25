import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import Icon from './Icon';

const RecentBookingCard = ({ booking, onPress }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const STATUS_CONFIG = {
    pending:   { color: colors.warning, bg: colors.warning + '26', label: 'Pending' },
    confirmed: { color: colors.success, bg: colors.success + '26', label: 'Confirmed' },
    rejected:  { color: colors.error, bg: colors.error + '26', label: 'Rejected' },
    cancelled: { color: colors.textLight, bg: colors.inputBg, label: 'Cancelled' },
    completed: { color: colors.primary, bg: colors.primaryLight, label: 'Completed' },
  };

  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;

  return (
    <TouchableOpacity style={[styles.card, SHADOWS.sm]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.topRow}>
        <View style={styles.avatar}>
          <Icon name="user" size={18} color={colors.textSecondary} />
        </View>
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.name} numberOfLines={1}>{booking.user?.name || 'Player'}</Text>
          <View style={styles.dateRow}>
            <Icon name="calendar" size={11} color={colors.textLight} />
            <Text style={styles.date}>
              {new Date(booking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </Text>
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.label}>SCHEDULE TIME</Text>
          <Text style={styles.time}>{booking.startTime} - {booking.endTime}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.label}>AMOUNT</Text>
          <Text style={styles.amount}>₹{booking.totalAmount}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    padding: 16,
    marginBottom: 12,
  },
  topRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.inputBg,
    alignItems: 'center', justifyContent: 'center',
  },
  name: { fontSize: SIZES.base, fontWeight: '700', color: colors.text },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  date: { fontSize: SIZES.xs, color: colors.textLight, marginLeft: 5 },
  badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  label: { fontSize: 10, color: colors.textLight, fontWeight: '700', letterSpacing: 0.4, marginBottom: 4 },
  time: { fontSize: SIZES.sm, fontWeight: '700', color: colors.text },
  amount: { fontSize: SIZES.base, fontWeight: '800', color: colors.primary },
});

export default RecentBookingCard;