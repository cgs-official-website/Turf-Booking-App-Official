import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from 'react-native-vector-icons/Feather';
import useTheme from '../hooks/useTheme';
import { turfsApi } from '../api/turfs';
import { getImageUrl } from '../api/client';
import { RatingBadge } from '../components/RatingBadge';
import { RADIUS, SPACING, SHADOW, FONT } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';

const formatScheduleText = (offer) => {
  const scope = String(offer.scope || 'date_range').toLowerCase();
  if (scope === 'slot') {
    const slots = Array.isArray(offer.applicableSlots) ? offer.applicableSlots : [];
    return slots.length > 0 ? `Specific Slots: ${slots.slice(0, 3).join(', ')}${slots.length > 3 ? '...' : ''}` : 'Specific Slots';
  }
  if (scope === 'weekdays') {
    const days = Array.isArray(offer.weekdays) ? offer.weekdays : [];
    const map = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
    const names = days.map((d) => map[d] || d);
    return names.length > 0 ? `Days: ${names.join(', ')}` : 'Selected Weekdays';
  }
  if (scope === 'day') {
    return `Valid on ${offer.startDate}`;
  }
  return `Valid until ${offer.endDate}`;
};

export default function OffersScreen({ navigation }) {
  const { C, dark } = useTheme();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'upcoming'

  const fetchOffers = useCallback(async () => {
    try {
      const res = await turfsApi.getOffers({ includeUpcoming: true });
      const list = res.data?.offers || res.offers || [];
      setOffers(list);
    } catch (err) {
      console.warn('Failed to fetch offers:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const { activeOffers, upcomingOffers } = useMemo(() => {
    const active = [];
    const upcoming = [];

    offers.forEach((o) => {
      if (o.status !== 'active') return;
      const start = String(o.startDate).slice(0, 10);
      const end = String(o.endDate).slice(0, 10);

      if (todayStr >= start && todayStr <= end) {
        active.push(o);
      } else if (todayStr < start) {
        upcoming.push(o);
      }
    });

    return { activeOffers: active, upcomingOffers: upcoming };
  }, [offers, todayStr]);

  const displayedList = activeTab === 'active' ? activeOffers : upcomingOffers;

  const handleBookOffer = (offer) => {
    if (!offer.turf) return;
    navigation.navigate('SlotPicker', {
      turf: {
        ...offer.turf,
        id: offer.turfId,
        _id: offer.turfId,
        activeOffer: offer,
      },
    });
  };

  const handleViewTurf = (offer) => {
    if (!offer.turf) return;
    navigation.navigate('TurfDetail', {
      turf: {
        ...offer.turf,
        id: offer.turfId,
        _id: offer.turfId,
      },
    });
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: C.bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} backgroundColor={C.bg} />

      {/* ── Top Bar ── */}
      <View style={[styles.topBar, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.card, borderColor: C.border }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Feather name="arrow-left" size={20} color={C.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginHorizontal: 12 }}>
          <Text style={[styles.screenTitle, { color: C.text }]}>Exclusive Offers</Text>
          <Text style={[styles.screenSub, { color: C.subtext }]}>Save big on top turf match slots</Text>
        </View>
      </View>

      {/* ── Active vs Upcoming Tabs ── */}
      <View style={[styles.tabRow, { borderBottomColor: C.border }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'active' && [styles.tabBtnActive, { borderBottomColor: C.primary }]]}
          onPress={() => setActiveTab('active')}
          activeOpacity={0.7}
        >
          <Feather
            name="zap"
            size={14}
            color={activeTab === 'active' ? C.primary : C.subtext}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'active' ? C.primary : C.subtext, fontWeight: activeTab === 'active' ? '800' : '600' },
            ]}
          >
            Live Deals ({activeOffers.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'upcoming' && [styles.tabBtnActive, { borderBottomColor: C.primary }]]}
          onPress={() => setActiveTab('upcoming')}
          activeOpacity={0.7}
        >
          <Feather
            name="calendar"
            size={14}
            color={activeTab === 'upcoming' ? C.primary : C.subtext}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'upcoming' ? C.primary : C.subtext, fontWeight: activeTab === 'upcoming' ? '800' : '600' },
            ]}
          >
            Upcoming Deals ({upcomingOffers.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── List Content ── */}
      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={[styles.loadingText, { color: C.subtext }]}>Loading offers...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        >
          {displayedList.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={[styles.emptyIconWrap, { backgroundColor: C.primaryLight }]}>
                <Feather name="tag" size={32} color={C.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: C.text }]}>
                {activeTab === 'active' ? 'No Active Deals Right Now' : 'No Upcoming Deals Scheduled'}
              </Text>
              <Text style={[styles.emptySub, { color: C.subtext }]}>
                {activeTab === 'active'
                  ? 'Check back soon or explore regular ground slots across the city.'
                  : 'Vendors post upcoming festival and weekend deals regularly. Check back soon!'}
              </Text>
              <TouchableOpacity
                style={[styles.exploreBtn, { backgroundColor: C.primary }]}
                onPress={() => navigation.navigate('Explore')}
                activeOpacity={0.85}
              >
                <Text style={styles.exploreBtnText}>Browse Available Turfs</Text>
              </TouchableOpacity>
            </View>
          ) : (
            displayedList.map((item) => {
              const turf = item.turf || {};
              const banner = item.bannerUrl ? getImageUrl(item.bannerUrl) : null;
              const turfThumb = turf.images?.[0] ? getImageUrl(turf.images[0]) : PLACEHOLDER_IMG;
              const original = item.originalPrice || turf.pricePerHour || 800;
              const discounted = item.discountedPrice || Math.round(original * 0.8);
              const scheduleInfo = formatScheduleText(item);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.offerCard,
                    { backgroundColor: C.card, borderColor: C.border },
                    SHADOW.card,
                  ]}
                >
                  {/* Banner or Default Vibrant Header */}
                  {banner ? (
                    <View style={styles.bannerWrap}>
                      <Image source={{ uri: banner }} style={styles.bannerImg} resizeMode="cover" />
                      <View style={styles.badgeOverlay}>
                        <Text style={styles.badgeText}>{item.discountLabel}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={[styles.gradientBanner, { backgroundColor: C.primary }]}>
                      <View style={styles.gradientBadge}>
                        <Feather name="percent" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.gradientBadgeText}>{item.discountLabel}</Text>
                      </View>
                      <Text style={styles.gradientTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                    </View>
                  )}

                  {/* Body Content */}
                  <View style={styles.cardContent}>
                    {/* Title & Description */}
                    <Text style={[styles.offerTitle, { color: C.text }]} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {!!item.description && (
                      <Text style={[styles.offerDesc, { color: C.subtext }]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    )}

                    {/* Turf Info Block */}
                    <TouchableOpacity
                      style={[styles.turfRow, { backgroundColor: C.bgSoft, borderColor: C.border }]}
                      onPress={() => handleViewTurf(item)}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: turfThumb }} style={styles.turfThumb} resizeMode="cover" />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.turfName, { color: C.text }]} numberOfLines={1}>
                          {turf.name || 'Turf Pitch'}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                          <Feather name="map-pin" size={11} color={C.subtext} style={{ marginRight: 4 }} />
                          <Text style={[styles.turfLocation, { color: C.subtext }]} numberOfLines={1}>
                            {turf.city || turf.location?.city || turf.address || 'Chennai'}
                          </Text>
                        </View>
                      </View>
                      <RatingBadge rating={turf.ratingAvg || 4.8} count={turf.reviewsCount || 10} size="sm" />
                    </TouchableOpacity>

                    {/* Validity & Timing Pill */}
                    <View style={[styles.validityPill, { backgroundColor: C.bgSoft }]}>
                      <Feather name="clock" size={12} color={C.primary} style={{ marginRight: 6 }} />
                      <Text style={[styles.validityText, { color: C.text }]} numberOfLines={1}>
                        {scheduleInfo}
                      </Text>
                    </View>

                    {/* Price & Booking Actions */}
                    <View style={[styles.footerRow, { borderTopColor: C.border }]}>
                      <View>
                        <Text style={[styles.pricePrefix, { color: C.subtext }]}>Slot Price</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                          <Text style={[styles.discountPrice, { color: C.primary }]}>₹{discounted}</Text>
                          <Text style={[styles.originalPrice, { color: C.subtext }]}>₹{original}</Text>
                          <Text style={[styles.priceUnit, { color: C.subtext }]}>/hr</Text>
                        </View>
                      </View>

                      <View style={styles.actionBtnsRow}>
                        <TouchableOpacity
                          style={[styles.outlineBtn, { borderColor: C.border }]}
                          onPress={() => handleViewTurf(item)}
                          activeOpacity={0.75}
                        >
                          <Text style={[styles.outlineBtnText, { color: C.text }]}>Details</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.bookBtn, { backgroundColor: C.primary }]}
                          onPress={() => handleBookOffer(item)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.bookBtnText}>Book Slot</Text>
                          <Feather name="chevron-right" size={14} color="#FFFFFF" style={{ marginLeft: 2 }} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  screenSub: {
    fontSize: 12,
    marginTop: 1,
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SPACING.lg,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabText: {
    fontSize: 13,
  },
  listContainer: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  emptyCard: {
    alignItems: 'center',
    padding: 36,
    marginTop: 20,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 19,
  },
  exploreBtn: {
    marginTop: 22,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: RADIUS.round,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  offerCard: {
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 18,
  },
  bannerWrap: {
    height: 140,
    width: '100%',
  },
  bannerImg: {
    width: '100%',
    height: '100%',
  },
  badgeOverlay: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#E11D48',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  gradientBanner: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.round,
  },
  gradientBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 13,
  },
  gradientTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    flex: 1,
    marginLeft: 12,
    textAlign: 'right',
  },
  cardContent: {
    padding: 16,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  offerDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
  },
  turfRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 10,
    marginTop: 12,
  },
  turfThumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
  },
  turfName: {
    fontSize: 13,
    fontWeight: '700',
  },
  turfLocation: {
    fontSize: 11,
  },
  validityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: RADIUS.round,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  validityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
  },
  pricePrefix: {
    fontSize: 10,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  discountPrice: {
    fontSize: 19,
    fontWeight: '900',
    marginRight: 6,
  },
  originalPrice: {
    fontSize: 13,
    textDecorationLine: 'line-through',
    marginRight: 3,
  },
  priceUnit: {
    fontSize: 11,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  outlineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.round,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
});
