import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { SIZES, SHADOWS } from '../utils/theme';
import { useTheme } from '../context/ThemeContext';
import { getImageUrl } from '../api/client';

const TurfCard = ({ turf, onPress, onEdit, onDelete }) => {
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const STATUS_CONFIG = {
    active:   { color: colors.success, bg: colors.success + '26', label: '● Active' },
    pending:  { color: colors.warning, bg: colors.warning + '26', label: '● Under Review' },
    rejected: { color: colors.error,   bg: colors.error + '26', label: '● Rejected' },
    inactive: { color: colors.error,   bg: colors.error + '26', label: '● Inactive' },
  };

  const cfg = STATUS_CONFIG[turf.status] || STATUS_CONFIG.pending;

  return (
    <TouchableOpacity style={[styles.card, SHADOWS.sm]} onPress={onPress} activeOpacity={0.85}>
      {turf.images?.[0] ? (
        <Image source={{ uri: getImageUrl(turf.images[0]) }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.placeholderIcon}>🏟️</Text>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text style={styles.name} numberOfLines={1}>{turf.name}</Text>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        <Text style={styles.location} numberOfLines={1}>📍 {turf.location?.address || turf.location || 'No address'}</Text>
        <Text style={styles.price}>₹{turf.pricePerHour}/hr</Text>

        <View style={styles.tags}>
          {turf.sports?.slice(0, 3).map((s) => (
            <View key={s} style={styles.tag}>
              <Text style={styles.tagText}>{s}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.editBtn} onPress={onEdit}>
            <Text style={styles.editText}>✏️ Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
            <Text style={styles.deleteText}>🗑️ Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (colors) => StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: SIZES.radius,
    marginBottom: 14,
    overflow: 'hidden',
  },
  image: { width: '100%', height: 160, resizeMode: 'cover' },
  imagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: { fontSize: 40 },
  body: { padding: 14 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name: { fontSize: SIZES.lg, fontWeight: '700', color: colors.text, flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 10, fontWeight: '600' },
  location: { fontSize: SIZES.sm, color: colors.textSecondary, marginBottom: 6 },
  price: { fontSize: SIZES.base, fontWeight: '700', color: colors.primary, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  tag: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  tagText: { fontSize: SIZES.xs, color: colors.primary, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 10 },
  editBtn: {
    flex: 1, backgroundColor: colors.primaryLight, borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  editText: { fontSize: SIZES.sm, color: colors.primary, fontWeight: '600' },
  deleteBtn: {
    flex: 1, backgroundColor: colors.error + '26', borderRadius: 8,
    paddingVertical: 8, alignItems: 'center',
  },
  deleteText: { fontSize: SIZES.sm, color: colors.error, fontWeight: '600' },
});

export default TurfCard;