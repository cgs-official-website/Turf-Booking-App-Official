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
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { turfsApi } from '../api/turfs';
import { getImageUrl } from '../api/client';
import { RatingBadge } from '../components/RatingBadge';
import { RADIUS, SPACING, SHADOW, FONT } from '../utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';

const getLocalDateStr = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatScheduleText = (offer) => {
  const scope = String(offer.scope || 'date_range').toLowerCase();
  if (scope === 'day') {
    return `Valid on ${offer.startDate}`;
  }
  if (scope === 'weekdays') {
    const days = Array.isArray(offer.weekdays) ? offer.weekdays : [];
    const map = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
    const names = days.map((d) => map[d] || d);
    return names.length > 0 ? `Valid on: ${names.join(', ')}` : 'Valid on Weekdays';
  }
  if (offer.endDate) {
    return `Valid till ${offer.endDate}`;
  }
  return 'Limited Time Deal';
};

// "14:00" -> "2 PM", "09:30" -> "9:30 AM"
const to12hText = (t) => {
  const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!m) return String(t || '');
  const h24 = Number(m[1]) % 24;
  const min = m[2];
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h = h24 % 12 || 12;
  return min === '00' ? `${h} ${ap}` : `${h}:${min} ${ap}`;
};

const formatSlotRange12h = (slot) => {
  const [a, b] = String(slot).split('-');
  return b ? `${to12hText(a)} – ${to12hText(b)}` : to12hText(a);
};

const formatEligibleSlotsText = (offer) => {
  if (offer.eligibleSlotLabel) return offer.eligibleSlotLabel;
  const scope = String(offer.scope || 'date_range').toLowerCase();
  if (scope === 'slot') {
    const slots = Array.isArray(offer.applicableSlots) ? offer.applicableSlots : [];
    const sorted = [...slots].sort();
    return sorted.length > 0
      ? `Slots: ${sorted.slice(0, 3).map(formatSlotRange12h).join(', ')}${sorted.length > 3 ? '...' : ''}`
      : 'Specific Slots';
  }
  if (scope === 'day') {
    return 'All Slots Today';
  }
  if (scope === 'weekdays') {
    const days = Array.isArray(offer.weekdays) ? offer.weekdays : [];
    const map = { 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat', 0: 'Sun' };
    const names = days.map((d) => map[d] || d);
    return names.length > 0 ? `${names.join(', ')} Slots` : 'Weekday Slots';
  }
  return 'All Day Slots';
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

  useFocusEffect(
    useCallback(() => {
      fetchOffers();
    }, [fetchOffers])
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        fetchOffers();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [fetchOffers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOffers();
  };

  const todayStr = useMemo(() => getLocalDateStr(), []);
  const now = useMemo(() => new Date(), []);
  const dayNum = now.getDay();
  const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const todayName = dayNames[dayNum];

  const { activeOffers, upcomingOffers } = useMemo(() => {
    const active = [];
    const upcoming = [];

    offers.forEach((o) => {
      if (o.status !== 'active') return;
      const start = String(o.startDate || '').slice(0, 10);
      const end = String(o.endDate || o.startDate || '').slice(0, 10);

      if (todayStr >= start && todayStr <= end) {
        if (o.scope === 'weekdays') {
          const wds = Array.isArray(o.weekdays) ? o.weekdays : [];
          const matchesToday = wds.some((w) => {
            if (typeof w === 'number') return w === dayNum;
            const s = String(w).trim().toLowerCase();
            return s === todayName || s === String(dayNum);
          });
          if (matchesToday) {
            active.push(o);
          } else {
            upcoming.push(o);
          }
        } else {
          active.push(o);
        }
      } else if (todayStr < start) {
        upcoming.push(o);
      }
    });

    return { activeOffers: active, upcomingOffers: upcoming };
  }, [offers, todayStr, dayNum, todayName]);

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
      date: offer.startDate && offer.startDate >= todayStr ? offer.startDate : todayStr,
    });
  };

  const handleViewTurf = (offer) => {
    const turfId = offer.turfId || offer.turf?.id || offer.turf?._id;
    if (!turfId) return;
    navigation.navigate('TurfDetail', {
      id: turfId,
      turf: offer.turf
        ? { ...offer.turf, id: turfId, _id: turfId }
        : undefined,
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
                <Ionicons name="pricetag" size={32} color={C.primary} />
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
              const discounted = item.discountedPrice || item.offerPrice || Math.round(original * 0.8);
              const saving = item.saving || Math.max(0, original - discounted);
              const scheduleInfo = formatScheduleText(item);
              const eligibleSlotsInfo = formatEligibleSlotsText(item);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.offerCard,
                    { backgroundColor: C.card, borderColor: C.border },
                    SHADOW.card,
                  ]}
                >
                  {/* Banner or Premium Dark-Green-and-Gold Fallback Header */}
                  {banner ? (
                    <View style={styles.bannerWrap}>
                      <Image source={{ uri: banner }} style={styles.bannerImg} resizeMode="cover" />
                      <View style={styles.badgeOverlay}>
                        <Ionicons name="pricetag" size={11} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.badgeText}>{item.discountLabel}</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.fallbackGoldenBanner}>
                      <View style={styles.fallbackTopRow}>
                        <View style={styles.fallbackTagBadge}>
                          <Text style={styles.fallbackTagText}>TURF DEAL</Text>
                        </View>
                        <View style={styles.fallbackDiscountPill}>
                          <Text style={styles.fallbackDiscountText}>{item.discountLabel}</Text>
                        </View>
                      </View>
                      <Text style={styles.fallbackTitle} numberOfLines={1}>
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

                    {/* Validity & Eligible Slots Pills */}
                    <View style={styles.metaPillsRow}>
                      <View style={[styles.metaPill, { backgroundColor: C.bgSoft }]}>
                        <Feather name="calendar" size={11} color={C.primary} style={{ marginRight: 5 }} />
                        <Text style={[styles.metaPillText, { color: C.text }]} numberOfLines={1}>
                          {scheduleInfo}
                        </Text>
                      </View>

                      <View style={[styles.metaPill, { backgroundColor: dark ? 'rgba(245, 158, 11, 0.16)' : '#FEF3C7' }]}>
                        <Feather name="clock" size={11} color="#D97706" style={{ marginRight: 5 }} />
                        <Text style={[styles.metaPillText, { color: dark ? '#FBBF24' : '#B45309' }]} numberOfLines={1}>
                          {eligibleSlotsInfo}
                        </Text>
                      </View>
                    </View>

                    {/* Price & Booking Actions */}
                    <View style={[styles.footerRow, { borderTopColor: C.border }]}>
                      <View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
                          <Text style={[styles.pricePrefix, { color: C.subtext }]}>Slot Price</Text>
                          {saving > 0 && (
                            <View style={styles.savingsPill}>
                              <Text style={styles.savingsText}>Save ₹{saving}</Text>
                            </View>
                          )}
                        </View>
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
                          <Text style={styles.bookBtnText}>Book at This Price</Text>
                          <Feather name="arrow-right" size={13} color="#FFFFFF" style={{ marginLeft: 4 }} />
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
    height: 145,
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  fallbackGoldenBanner: {
    backgroundColor: '#062C22',
    borderBottomWidth: 1.5,
    borderBottomColor: '#D4AF37',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  fallbackTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fallbackTagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.18)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.4)',
  },
  fallbackTagText: {
    color: '#FBBF24',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  fallbackDiscountPill: {
    backgroundColor: '#F59E0B',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  fallbackDiscountText: {
    color: '#062C22',
    fontSize: 12,
    fontWeight: '900',
  },
  fallbackTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
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
  metaPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.round,
  },
  metaPillText: {
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
  savingsPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    marginLeft: 6,
  },
  savingsText: {
    color: '#15803D',
    fontSize: 9.5,
    fontWeight: '800',
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
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: RADIUS.round,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12.5,
  },
});