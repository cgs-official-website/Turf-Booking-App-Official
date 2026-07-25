// @theme-ready ✅
import React, { useEffect, useMemo, useState, useLayoutEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Image, Alert, ActivityIndicator, FlatList,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMyReviews, toggleReviewVisibility, deleteReview,
} from '../redux/vendorSlice';
import { useTheme } from '../context/ThemeContext';
import { SIZES, SHADOWS } from '../utils/theme';
import Icon from '../components/Icon';
import Feather from 'react-native-vector-icons/Feather';

const FILTERS = ['All', 'Book Experience', 'Turf Quality', 'Facilities'];

const RatingBar = ({ star, count, max, colors, styles }) => (
  <View style={styles.ratingBarRow}>
    <View style={styles.ratingBarStar}>
      <Text style={styles.ratingBarStarText}>{star}</Text>
      <Feather name="star" size={11} color={colors.warning || '#F5A623'} />
    </View>
    <View style={styles.ratingBarTrack}>
      <View style={[styles.ratingBarFill, { width: `${max ? (count / max) * 100 : 0}%` }]} />
    </View>
    <Text style={styles.ratingBarCount}>{count}</Text>
  </View>
);

const Stars = ({ value, colors }) => (
  <View style={{ flexDirection: 'row', gap: 2 }}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Feather key={i} name="star" size={13} color={i <= value ? (colors.warning || '#F5A623') : colors.border} />
    ))}
  </View>
);

const ReviewCard = ({ review, onHide, onDelete, busyId, colors, styles }) => {
  const busy = busyId === review._id;
  return (
    <View style={[styles.reviewCard, SHADOWS.sm]}>
      <View style={styles.reviewTop}>
        {review.user?.avatar ? (
          <Image source={{ uri: review.user.avatar }} style={styles.reviewAvatar} />
        ) : (
          <View style={styles.reviewAvatarFallback}>
            <Text style={styles.reviewAvatarFallbackText}>{review.user?.name?.[0]?.toUpperCase() || 'U'}</Text>
          </View>
        )}
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={styles.reviewerName}>{review.user?.name || 'Anonymous'}</Text>
          <Stars value={review.rating} colors={colors} />
        </View>
        <TouchableOpacity
          style={styles.iconBtn}
          disabled={busy}
          onPress={() => onHide(review)}
        >
          <Feather name={review.hidden ? 'eye' : 'eye-off'} size={16} color={colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.iconBtn, styles.deleteIconBtn]}
          disabled={busy}
          onPress={() => onDelete(review)}
        >
          {busy ? <ActivityIndicator size="small" color={colors.error} /> : <Feather name="trash-2" size={16} color={colors.error} />}
        </TouchableOpacity>
      </View>

      <Text style={styles.reviewText}>{review.comment}</Text>

      {review.reply ? (
        <Text style={styles.reviewMeta}>{review.reply}</Text>
      ) : null}

      <View style={styles.divider} />

      <View style={styles.helpfulRow}>
        <Text style={styles.helpfulLabel}>Was this helpful?</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Feather name="thumbs-up" size={16} color={colors.primary} />
          <Feather name="thumbs-down" size={16} color={colors.error} />
        </View>
      </View>
    </View>
  );
};

const UserReviewsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const styles = getStyles(colors);

  const dispatch = useDispatch();
  const { reviews = [], ratingSummary, loading } = useSelector((s) => s.vendor);
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchMyReviews());
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'All') return reviews;
    return reviews.filter((r) => r.category === filter);
  }, [reviews, filter]);

  const breakdown = ratingSummary?.breakdown || { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  const maxCount = Math.max(1, ...Object.values(breakdown));

  const handleHide = (review) => {
    setBusyId(review._id);
    dispatch(toggleReviewVisibility(review._id)).finally(() => setBusyId(null));
  };

  const handleDelete = (review) => {
    Alert.alert('Delete review', 'This review will be permanently removed. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setBusyId(review._id);
          dispatch(deleteReview(review._id)).finally(() => setBusyId(null));
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.customHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton} activeOpacity={0.7}>
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reviews & Ratings</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !reviews.length ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          contentContainerStyle={styles.content}
          data={filtered}
          keyExtractor={(item) => item._id}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={(
            <>
              <View style={[styles.summaryCard, SHADOWS.sm]}>
                <View style={styles.summaryLeft}>
                  <Text style={styles.summaryLabel}>Ratings</Text>
                  <Text style={styles.summaryScore}>{ratingSummary?.average?.toFixed(1) ?? '0.0'}</Text>
                  <Text style={styles.summaryTotal}>{ratingSummary?.total ?? 0} Reviews</Text>
                </View>
                <View style={styles.summaryRight}>
                  {[5, 4, 3, 2, 1].map((star) => (
                    <RatingBar key={star} star={star} count={breakdown[star] || 0} max={maxCount} colors={colors} styles={styles} />
                  ))}
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterChip, filter === f && styles.filterChipActive]}
                    onPress={() => setFilter(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.reviewsHeading}>Reviews</Text>
            </>
          )}
          renderItem={({ item }) => (
            <ReviewCard review={item} onHide={handleHide} onDelete={handleDelete} busyId={busyId} colors={colors} styles={styles} />
          )}
          ListEmptyComponent={(
            <View style={{ alignItems: 'center', marginTop: 40 }}>
              <Feather name="award" size={28} color={colors.textLight || colors.textSecondary} />
              <Text style={{ color: colors.textSecondary, marginTop: 10 }}>No reviews in this category yet.</Text>
            </View>
          )}
        />
      )}
    </View>
  );
};

const getStyles = (colors) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  customHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingVertical: 12,
    backgroundColor: colors.card || colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.inputBg || colors.border,
  },
  headerTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: colors.text,
  },
  content: { paddingHorizontal: SIZES.padding, paddingBottom: 40, paddingTop: 14 },

  summaryCard: {
    flexDirection: 'row', backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg,
    padding: 16, marginBottom: 18,
  },
  summaryLeft: { width: 90, alignItems: 'flex-start', justifyContent: 'center' },
  summaryLabel: { fontSize: SIZES.base, fontWeight: '700', color: colors.text },
  summaryScore: { fontSize: 32, fontWeight: '800', color: colors.text, marginTop: 4 },
  summaryTotal: { fontSize: SIZES.xs, color: colors.textSecondary, marginTop: 2 },
  summaryRight: { flex: 1, justifyContent: 'center', gap: 4, marginLeft: 8 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarStar: { flexDirection: 'row', alignItems: 'center', width: 20, gap: 2 },
  ratingBarStarText: { fontSize: 10, color: colors.textSecondary },
  ratingBarTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.border, overflow: 'hidden' },
  ratingBarFill: { height: '100%', backgroundColor: colors.success, borderRadius: 3 },
  ratingBarCount: { fontSize: 10, color: colors.textSecondary, width: 30, textAlign: 'right' },

  filterRow: { marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20,
    borderWidth: 1, borderColor: colors.primary, marginRight: 10,
    backgroundColor: colors.card || colors.background,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterChipText: { fontSize: SIZES.sm, fontWeight: '600', color: colors.primary },
  filterChipTextActive: { color: colors.onAccent || '#FFFFFF' },

  reviewsHeading: { fontSize: SIZES.lg, fontWeight: '800', color: colors.text, marginBottom: 12 },

  reviewCard: { backgroundColor: colors.card || colors.background, borderRadius: SIZES.radiusLg, padding: 14, marginBottom: 14 },
  reviewTop: { flexDirection: 'row', alignItems: 'center' },
  reviewAvatar: { width: 40, height: 40, borderRadius: 20 },
  reviewAvatarFallback: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  reviewAvatarFallbackText: { color: colors.onAccent || '#FFFFFF', fontWeight: '700' },
  reviewerName: { fontSize: SIZES.base, fontWeight: '700', color: colors.text, marginBottom: 3 },
  iconBtn: {
    width: 30, height: 30, borderRadius: 8, backgroundColor: colors.inputBg || colors.border,
    alignItems: 'center', justifyContent: 'center', marginLeft: 6,
  },
  deleteIconBtn: { backgroundColor: colors.isDark ? '#451A03' : '#FEE2E2' },
  reviewText: { fontSize: SIZES.sm, color: colors.text, marginTop: 12, lineHeight: 19 },
  reviewMeta: { fontSize: SIZES.xs, color: colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
  divider: { height: 1, backgroundColor: colors.border, marginTop: 12, marginBottom: 10 },
  helpfulRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  helpfulLabel: { fontSize: SIZES.xs, color: colors.textSecondary },
});

export default UserReviewsScreen; 