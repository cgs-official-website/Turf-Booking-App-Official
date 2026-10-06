import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { RADIUS, FONT } from '../utils/theme';

export function RatingBadge({ rating, count, size = 'md' }) {
  const isSmall = size === 'sm';
  const numRating = Number(rating);
  const isUnrated = isNaN(numRating) || numRating <= 0 || count === 0;

  if (isUnrated) {
    return (
      <View style={[styles.unratedWrap, isSmall && styles.unratedWrapSmall]}>
        <Feather name="star" size={isSmall ? 10 : 12} color="#94A3B8" style={{ marginRight: 3 }} />
        <Text style={[styles.unratedText, isSmall && styles.unratedTextSmall]}>
          No reviews
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.ratingWrap, isSmall && styles.ratingWrapSmall]}>
      <Feather name="star" size={isSmall ? 10 : 12} color="#F59E0B" style={{ marginRight: 3 }} />
      <Text style={[styles.ratingText, isSmall && styles.ratingTextSmall]}>
        {numRating.toFixed(1)}
      </Text>
      {count !== undefined && count > 0 && (
        <Text style={[styles.countText, isSmall && styles.countTextSmall]}>
          ({count})
        </Text>
      )}
    </View>
  );
}

export function StatusBadge({ status = 'confirmed', label }) {
  const getMeta = () => {
    switch (status?.toLowerCase()) {
      case 'confirmed':
      case 'accepted':
      case 'completed':
      case 'active':
        return { bg: '#D1FAE5', text: '#059669', defaultLabel: 'Confirmed' };
      case 'pending':
      case 'reserved':
      case 'requested':
        return { bg: '#FEF3C7', text: '#D97706', defaultLabel: 'Pending' };
      case 'cancelled':
      case 'rejected':
        return { bg: '#FEE2E2', text: '#DC2626', defaultLabel: 'Cancelled' };
      default:
        return { bg: '#F1F5F9', text: '#475569', defaultLabel: status };
    }
  };

  const meta = getMeta();

  return (
    <View style={[styles.statusWrap, { backgroundColor: meta.bg }]}>
      <Text style={[styles.statusText, { color: meta.text }]}>
        {label || meta.defaultLabel}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.14)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  ratingWrapSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#D97706',
  },
  ratingTextSmall: {
    fontSize: 10,
  },
  countText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#92400E',
    marginLeft: 2,
  },
  countTextSmall: {
    fontSize: 9,
  },
  unratedWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  unratedWrapSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  unratedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  unratedTextSmall: {
    fontSize: 9,
  },
  statusWrap: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
});
