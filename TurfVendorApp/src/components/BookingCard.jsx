import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, Image } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { getImageUrl } from '../api/client';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';

const STATUS_CONFIG = {
  pending:   { bg: 'rgba(245, 158, 11, 0.12)', text: '#F59E0B', border: 'rgba(245, 158, 11, 0.3)', label: 'PENDING' },
  confirmed: { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)', label: 'CONFIRMED' },
  accepted:  { bg: 'rgba(16, 185, 129, 0.12)', text: '#10B981', border: 'rgba(16, 185, 129, 0.3)', label: 'CONFIRMED' },
  rejected:  { bg: 'rgba(239, 68, 68, 0.12)', text: '#EF4444', border: 'rgba(239, 68, 68, 0.3)', label: 'REJECTED' },
  cancelled: { bg: 'rgba(156, 163, 175, 0.12)', text: '#9CA3AF', border: 'rgba(156, 163, 175, 0.3)', label: 'CANCELLED' },
};

const shortId = (id = '') => id.slice(-6).toUpperCase();

const formatDate = (d) => {
  if (!d) return '';
  const date = new Date(d);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const BookingCard = ({ booking, onPress, onAccept, onReject }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);
  const cfg = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed' || booking.status === 'accepted';
  const userName = booking.user?.name || booking.userName || 'Turf Player';
  const userAvatar = booking.user?.avatar || booking.user?.photo || null;
  const initial = userName.charAt(0).toUpperCase() || 'P';

  const handleCall = () => {
    const phone = booking.user?.phone || booking.phone;
    if (phone) Linking.openURL(`tel:${phone}`);
  };

  return (
    <TouchableOpacity style={[styles.card, SHADOWS.sm]} onPress={onPress} activeOpacity={0.85}>
      {/* Header Row: Avatar + User info + Status badge */}
      <View style={styles.headerRow}>
        <View style={styles.avatarWrap}>
          {userAvatar ? (
            <Image
              source={{ uri: getImageUrl(userAvatar) }}
              style={styles.avatarImg}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.avatarInitial}>{initial}</Text>
          )}
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName} numberOfLines={1}>{userName}</Text>
          <Text style={styles.reqId}>REQ #{shortId(booking._id || booking.id)}</Text>
        </View>

        <View style={[styles.statusBadge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <View style={[styles.statusDot, { backgroundColor: cfg.text }]} />
          <Text style={[styles.statusText, { color: cfg.text }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Details Row (Date, Time, Game, Players) */}
      <View style={styles.chipsRow}>
        <View style={styles.chip}>
          <Ionicons name="calendar-outline" size={13} color={colors.primary} />
          <Text style={styles.chipText}>{formatDate(booking.date)}</Text>
        </View>

        <View style={styles.chip}>
          <Ionicons name="time-outline" size={13} color={colors.primary} />
          <Text style={styles.chipText}>{booking.startTime} - {booking.endTime}</Text>
        </View>

        {!!booking.gameType && (
          <View style={styles.chip}>
            <Ionicons name="football-outline" size={13} color={colors.primary} />
            <Text style={styles.chipText}>{booking.gameType}</Text>
          </View>
        )}
      </View>

      {/* Pricing & Footer Summary */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.amountLabel}>AMOUNT</Text>
          <Text style={styles.amountValue}>₹{booking.totalAmount || booking.amount || 0}</Text>
        </View>

        {isPending ? (
          <View style={styles.actionsGroup}>
            <TouchableOpacity style={styles.declineBtn} onPress={onReject} activeOpacity={0.85}>
              <Text style={styles.declineText}>Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} activeOpacity={0.85}>
              <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              <Text style={styles.acceptText}>Accept</Text>
            </TouchableOpacity>
          </View>
        ) : isConfirmed ? (
          <TouchableOpacity style={styles.callBtn} onPress={handleCall} activeOpacity={0.85}>
            <Ionicons name="call" size={14} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.callText}>Contact</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.viewDetailBtn}>
            <Text style={styles.viewDetailText}>View Details</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: SIZES.radiusLg,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: SIZES.base,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.3,
  },
  reqId: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 14,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBg,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 5,
  },
  chipText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
    color: colors.text,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  amountLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textSecondary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  amountValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: -0.5,
  },
  actionsGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  declineBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: {
    color: colors.error,
    fontWeight: '700',
    fontSize: SIZES.xs,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.primary,
    gap: 4,
  },
  acceptText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.xs,
  },
  callBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: colors.primary,
  },
  callText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: SIZES.xs,
  },
  viewDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewDetailText: {
    color: colors.primary,
    fontSize: SIZES.xs,
    fontWeight: '700',
  },
});

export default BookingCard;