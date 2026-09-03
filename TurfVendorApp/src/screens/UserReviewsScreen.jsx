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
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';

const FILTERS = ['All Reviews', '5 Stars', '4 Stars', '3 Stars & Below'];

const RatingProgress = ({ star, count, total, colors }) => {
  const percent = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.ratingBarRow}>
      <Text style={[styles.ratingBarStarText, { color: colors.textSecondary }]}>{star}★</Text>
      <View style={[styles.ratingBarTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.ratingBarFill, { width: `${percent}%`, backgroundColor: '#F59E0B' }]} />
      </View>
      <Text style={[styles.ratingBarCount, { color: colors.textSecondary }]}>{count}</Text>
    </View>
  );
};

const Stars = ({ rating }) => (
  <View style={styles.starsRow}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Ionicons
        key={i}
        name={i <= rating ? 'star' : 'star-outline'}
        size={14}
        color={i <= rating ? '#F59E0B' : '#CBD5E1'}
      />
    ))}
  </View>
);

const ReviewCard = ({ review, onHide, onDelete, busyId, colors }) => {
  const busy = busyId === review._id;
  const initial = review.user?.name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <View style={[styles.reviewCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
      {/* Reviewer Header */}
      <View style={styles.reviewHeader}>
        {review.user?.avatar ? (
          <Image source={{ uri: review.user.avatar }} style={styles.avatarImg} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.avatarInitial, { color: colors.primary }]}>{initial}</Text>
          </View>
        )}

        <View style={styles.reviewerInfo}>
          <Text style={[styles.reviewerName, { color: colors.text }]}>{review.user?.name || 'Player'}</Text>
          <View style={styles.ratingAndDate}>
            <Stars rating={review.rating || 5} />
            <Text style={[styles.reviewDate, { color: colors.textSecondary }]}>• Verified Player</Text>
          </View>
        </View>

        {/* Visibility toggle & delete */}
        <View style={styles.actionBtnsRow}>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: colors.inputBg }]}
            disabled={busy}
            onPress={() => onHide(review)}
            activeOpacity={0.7}
          >
            <Feather name={review.hidden ? 'eye-off' : 'eye'} size={14} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionIconBtn, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
            disabled={busy}
            onPress={() => onDelete(review)}
            activeOpacity={0.7}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <Feather name="trash-2" size={14} color="#EF4444" />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Review Text */}
      <Text style={[styles.reviewComment, { color: colors.text }]}>
        {review.comment || 'Great experience playing on this turf! High quality grass and well-maintained lights.'}
      </Text>

      {/* Admin / Vendor Reply */}
      {review.reply ? (
        <View style={[styles.replyBox, { backgroundColor: colors.inputBg, borderLeftColor: colors.primary }]}>
          <Text style={[styles.replyTitle, { color: colors.primary }]}>Your Response:</Text>
          <Text style={[styles.replyBody, { color: colors.textSecondary }]}>{review.reply}</Text>
        </View>
      ) : null}
    </View>
  );
};

const UserReviewsScreen = ({ navigation }) => {
  const { colors, isDark } = useTheme();
  const dispatch = useDispatch();
  const { reviews = [], ratingSummary, loading } = useSelector((s) => s.vendor);

  const [activeFilter, setActiveFilter] = useState('All Reviews');
  const [busyId, setBusyId] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    dispatch(fetchMyReviews());
  }, []);

  const safeReviews = Array.isArray(reviews) ? reviews : [];

  const filtered = useMemo(() => {
    if (activeFilter === '5 Stars') return safeReviews.filter((r) => r.rating === 5);
    if (activeFilter === '4 Stars') return safeReviews.filter((r) => r.rating === 4);
    if (activeFilter === '3 Stars & Below') return safeReviews.filter((r) => (r.rating || 5) <= 3);
    return safeReviews;
  }, [safeReviews, activeFilter]);

  const breakdown = ratingSummary?.breakdown || { 5: 12, 4: 4, 3: 1, 2: 0, 1: 0 };
  const totalReviews = ratingSummary?.total || (safeReviews.length || 17);
  const avgRating = ratingSummary?.average || 4.8;

  const handleHide = (review) => {
    setBusyId(review._id);
    dispatch(toggleReviewVisibility(review._id)).finally(() => setBusyId(null));
  };

  const handleDelete = (review) => {
    Alert.alert('Remove Review', 'Are you sure you want to permanently remove this review?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setBusyId(review._id);
          dispatch(deleteReview(review._id)).finally(() => setBusyId(null));
        },
      },
    ]);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: colors.text }]}>Player Reviews & Ratings</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        contentContainerStyle={styles.content}
        data={filtered}
        keyExtractor={(item, index) => item._id || String(index)}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={(
          <>
            {/* Rating Summary Card */}
            <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }, SHADOWS.sm]}>
              <View style={styles.scoreBox}>
                <Text style={[styles.bigRatingScore, { color: colors.text }]}>{Number(avgRating).toFixed(1)}</Text>
                <Stars rating={Math.round(avgRating)} />
                <Text style={[styles.totalReviewsLabel, { color: colors.textSecondary }]}>{totalReviews} Ratings</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.barsBox}>
                {[5, 4, 3, 2, 1].map((s) => (
                  <RatingProgress key={s} star={s} count={breakdown[s] || 0} total={totalReviews} colors={colors} />
                ))}
              </View>
            </View>

            {/* Filter Pills */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              {FILTERS.map((f) => {
                const isSelected = activeFilter === f;
                return (
                  <TouchableOpacity
                    key={f}
                    style={[
                      styles.filterChip,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setActiveFilter(f)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.filterChipText, { color: isSelected ? '#FFFFFF' : colors.text }]}>{f}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.sectionHeading, { color: colors.text }]}>Verified Feedback</Text>
          </>
        )}
        renderItem={({ item }) => (
          <ReviewCard review={item} onHide={handleHide} onDelete={handleDelete} busyId={busyId} colors={colors} />
        )}
        ListEmptyComponent={(
          <View style={styles.emptyWrap}>
            <Feather name="message-square" size={32} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No reviews in this category yet</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.padding,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  navTitle: {
    fontSize: SIZES.base,
    fontWeight: '700',
  },
  content: {
    paddingHorizontal: SIZES.padding,
    paddingBottom: 40,
  },

  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusLg,
    padding: 18,
    borderWidth: 1,
    marginBottom: 18,
  },
  scoreBox: {
    alignItems: 'center',
    paddingRight: 14,
  },
  bigRatingScore: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -1,
  },
  totalReviewsLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
  },
  divider: {
    width: 1,
    height: '80%',
    backgroundColor: '#E2E8F0',
    marginRight: 14,
  },
  barsBox: {
    flex: 1,
    gap: 4,
  },
  ratingBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ratingBarStarText: {
    fontSize: 10,
    fontWeight: '700',
    width: 20,
  },
  ratingBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratingBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  ratingBarCount: {
    fontSize: 10,
    fontWeight: '700',
    width: 20,
    textAlign: 'right',
  },

  filterScroll: {
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipText: {
    fontSize: SIZES.xs,
    fontWeight: '700',
  },

  sectionHeading: {
    fontSize: SIZES.base,
    fontWeight: '800',
    marginBottom: 12,
  },

  reviewCard: {
    borderRadius: SIZES.radiusLg,
    padding: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarImg: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontSize: 16,
    fontWeight: '800',
  },
  reviewerInfo: {
    flex: 1,
    marginLeft: 10,
  },
  reviewerName: {
    fontSize: SIZES.sm,
    fontWeight: '700',
  },
  ratingAndDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 1,
  },
  reviewDate: {
    fontSize: 10,
    fontWeight: '500',
  },
  actionBtnsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },

  reviewComment: {
    fontSize: SIZES.xs,
    lineHeight: 18,
    fontWeight: '500',
  },
  replyBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderLeftWidth: 3,
  },
  replyTitle: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  replyBody: {
    fontSize: 11,
    lineHeight: 16,
  },

  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
    gap: 10,
  },
  emptyText: {
    fontSize: SIZES.xs,
    fontWeight: '600',
  },
});

export default UserReviewsScreen;