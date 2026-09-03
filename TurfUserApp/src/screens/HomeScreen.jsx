import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ScrollView, RefreshControl, StatusBar, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Geolocation from '@react-native-community/geolocation';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { turfsApi } from '../api/turfs';
import { notificationsApi } from '../api/notifications';
import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
import { setLocationPermission } from '../redux/authSlice';
import useTheme from '../hooks/useTheme';
import SearchBar from '../components/SearchBar';
import SportChip from '../components/SportChip';
import TurfCard from '../components/TurfCard';
import SectionHeader from '../components/SectionHeader';
import { TurfCardSkeleton } from '../components/SkeletonLoader';
import FilterBottomSheet from './FilterBottomSheet';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

const SPORTS = [
  { name: 'Football' },
  { name: 'Cricket' },
  { name: 'Badminton' },
  { name: 'Tennis' },
  { name: 'Basketball' },
  { name: 'Volleyball' },
];

const { width } = Dimensions.get('window');

// ─── Location Permission Screen ───────────────────────────────────────────────
function LocationPermissionView({ C, dark }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  const handleAllow = async () => {
    setLoading(true);
    Geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'User-Agent': 'NammaOoruTurfApp/1.0' } }
          );
          const data = await res.json();
          const addr = data.address;
          const cityName =
            addr.suburb || addr.town || addr.city ||
            addr.village || addr.county || addr.state || 'Current Location';
          dispatch(setLocationPermission(cityName));
        } catch {
          dispatch(setLocationPermission('Current Location'));
        }
        setLoading(false);
      },
      () => {
        dispatch(setLocationPermission(null));
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 1000 }
    );
  };

  const handleSkip = () => dispatch(setLocationPermission(null));

  return (
    <View style={[styles.permContainer, { backgroundColor: C.bg }]}>
      <View style={[styles.permIconCircle, { backgroundColor: C.primaryLight }]}>
        <Feather name="map-pin" size={48} color={C.primary} />
      </View>
      <Text style={[styles.permTitle, { color: C.text }]}>Enable Device Location</Text>
      <Text style={[styles.permSubtitle, { color: C.subtext }]}>
        Allow location access to discover premium turf arenas, live availability, and grounds nearest to you.
      </Text>
      <TouchableOpacity
        style={[styles.allowBtn, { backgroundColor: C.primary }, SHADOW.glow]}
        onPress={handleAllow}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.allowBtnText}>Allow Location Access</Text>
        )}
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
        <Text style={[styles.skipText, { color: C.subtext }]}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const dispatch  = useDispatch();
  const { C, dark } = useTheme();

  const user                      = useSelector((s) => s.auth.user);
  const wishlist                  = useSelector((s) => s.wishlist.wishlist);
  const locationPermissionGranted = useSelector((s) => s.auth.locationPermissionGranted);
  const location                  = useSelector((s) => s.auth.location);
  const [turfs,         setTurfs]         = useState([]);
  const [sport,         setSport]         = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [unread,        setUnread]        = useState(0);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ sort: null, time: null });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (sport)                params.sport = sport;
      if (activeFilters.sort)   params.sort  = activeFilters.sort;
      if (activeFilters.time)   params.time  = activeFilters.time;
      if (location && location !== 'Current Location') params.location = location;
      const res = await turfsApi.getTurfs(params);
      setTurfs(res.turfs || res.items || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sport, activeFilters, location]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    dispatch(fetchWishlist());
  }, [dispatch]);

  useFocusEffect(
    useCallback(() => {
      notificationsApi.getAll()
        .then((r) => setUnread(r.unreadCount ?? (r.notifications || []).filter((n) => !n.read).length))
        .catch(() => {});
    }, [])
  );

  const handleApplyFilter = (filters) => {
    setActiveFilters(filters);
  };

  if (!locationPermissionGranted) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={C.bg} />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <LocationPermissionView C={C} dark={dark} />
        </SafeAreaView>
      </View>
    );
  }

  const isWishlisted = (id) => wishlist.some((t) => (t._id || t.id) === id);
  const sorted = [...turfs].sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const featured = sorted.slice(0, 4);
  const nearby = sorted.length > 1 ? sorted.slice(1) : sorted;

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const displayName = user?.name?.split(' ')[0] || 'Player';
  const displayLocation = (location && location !== 'Current Location')
    ? location
    : (typeof user?.location === 'string' && user.location.trim()
        ? user.location.trim()
        : (user?.location?.address || user?.location?.city || 'Chennai, Tamil Nadu'));

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={C.bg} translucent={false} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[C.primary]} />}
        >
          {/* ── Top Header Bar ── */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[styles.greetingText, { color: C.subtext }]}>
                  {getTimeGreeting()}, {displayName}
                </Text>
                <Feather name="smile" size={13} color={C.primary} style={{ marginLeft: 5 }} />
              </View>
              <TouchableOpacity
                style={styles.locationRow}
                onPress={() => navigation.navigate('Location')}
                activeOpacity={0.7}
              >
                <Feather name="map-pin" size={14} color={C.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.locationText, { color: C.text }]} numberOfLines={1}>
                  {displayLocation}
                </Text>
                <Feather name="chevron-down" size={14} color={C.primary} style={{ marginLeft: 2 }} />
              </TouchableOpacity>
            </View>

            {/* Notification Bell */}
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: C.card, borderColor: C.border }]}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Feather name="bell" size={19} color={C.text} />
              {unread > 0 && <View style={[styles.badgeDot, { backgroundColor: C.error }]} />}
            </TouchableOpacity>
          </View>

          {/* ── Sticky Search Bar ── */}
          <View style={{ paddingHorizontal: SPACING.lg, marginTop: 4 }}>
            <SearchBar
              editable={false}
              onPress={() => navigation.navigate('Explore')}
              onFilterPress={() => setFilterVisible(true)}
              placeholder="Search stadiums, sports, or areas..."
            />
          </View>

          {/* ── Quick Action Cards ── */}
          <View style={styles.quickActionRow}>
            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}
              onPress={() => navigation.navigate('Explore')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: C.primaryLight }]}>
                <Feather name="calendar" size={16} color={C.primary} />
              </View>
              <Text style={[styles.quickTitle, { color: C.text }]} numberOfLines={1} adjustsFontSizeToFit>
                Book Slot
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}
              onPress={() => navigation.navigate('CreateMatch')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: '#FFEDD5' }]}>
                <Feather name="plus-circle" size={16} color="#EA580C" />
              </View>
              <Text style={[styles.quickTitle, { color: C.text }]} numberOfLines={1} adjustsFontSizeToFit>
                Create Match
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}
              onPress={() => navigation.navigate('Bookings')}
              activeOpacity={0.8}
            >
              <View style={[styles.quickIconWrap, { backgroundColor: '#DBEAFE' }]}>
                <Feather name="bookmark" size={16} color="#2563EB" />
              </View>
              <Text style={[styles.quickTitle, { color: C.text }]} numberOfLines={1} adjustsFontSizeToFit>
                My Pass
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Sports Category Selector ── */}
          <View style={styles.sportsSection}>
            <SectionHeader
              title="Sports Categories"
              subtitle="Filter turfs by your favourite sport"
              style={{ paddingHorizontal: SPACING.lg }}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
            >
              {SPORTS.map((s) => (
                <SportChip
                  key={s.name}
                  name={s.name}
                  icon={s.icon}
                  selected={sport === s.name}
                  onPress={() => setSport(sport === s.name ? null : s.name)}
                />
              ))}
            </ScrollView>
          </View>

          {/* ── Featured Turfs (Hero Carousel) ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Featured Stadiums"
              subtitle="Top-rated verified pitches ready for booking"
              actionText="View All"
              onActionPress={() => navigation.navigate('Explore')}
              style={{ paddingHorizontal: SPACING.lg }}
            />

            {loading && turfs.length === 0 ? (
              <View style={{ paddingHorizontal: SPACING.lg }}>
                <TurfCardSkeleton />
              </View>
            ) : (
              <FlatList
                data={featured}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item._id || item.id}
                contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
                renderItem={({ item }) => (
                  <TurfCard
                    turf={item}
                    variant="featured"
                    isFavorite={isWishlisted(item._id || item.id)}
                    onToggleFavorite={() => dispatch(toggleWishlist(item))}
                    onPress={() => navigation.navigate('TurfDetail', { id: item._id || item.id })}
                  />
                )}
              />
            )}
          </View>

          {/* ── Live Match Community Banner ── */}
          <TouchableOpacity
            style={[styles.matchBanner, { backgroundColor: dark ? '#132238' : '#0F172A' }, SHADOW.card]}
            onPress={() => navigation.navigate('CreateMatch')}
            activeOpacity={0.88}
          >
            <View style={styles.matchBannerContent}>
              <View style={styles.matchBadge}>
                <Feather name="zap" size={12} color="#F59E0B" style={{ marginRight: 4 }} />
                <Text style={styles.matchBadgeText}>LIVE CRICKET TOURNAMENT</Text>
              </View>
              <Text style={styles.matchBannerTitle}>Host a Match & Track Live Scorecard</Text>
              <Text style={styles.matchBannerSub}>
                Build squads, split Team A vs Team B, and run ball-by-ball commentary.
              </Text>
              <View style={[styles.matchBannerBtn, { backgroundColor: C.primary }]}>
                <Text style={styles.matchBannerBtnText}>Start New Match →</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* ── Nearby Pitches List ── */}
          <View style={styles.section}>
            <SectionHeader
              title="Nearby Grounds"
              subtitle="Fastest to reach from your current area"
              actionText="Explore"
              onActionPress={() => navigation.navigate('Explore')}
              style={{ paddingHorizontal: SPACING.lg }}
            />

            <View style={{ paddingHorizontal: SPACING.lg }}>
              {nearby.slice(0, 4).map((item) => (
                <TurfCard
                  key={item._id || item.id}
                  turf={item}
                  variant="vertical"
                  isFavorite={isWishlisted(item._id || item.id)}
                  onToggleFavorite={() => dispatch(toggleWishlist(item))}
                  onPress={() => navigation.navigate('TurfDetail', { id: item._id || item.id })}
                />
              ))}
            </View>
          </View>

          {/* ── Partner Venue Banner ── */}
          <TouchableOpacity
            style={[styles.partnerBanner, SHADOW.card]}
            activeOpacity={0.9}
          >
            <Image
              source={require('../assets/background1.png')}
              style={styles.partnerBg}
              resizeMode="cover"
            />
            <View style={styles.partnerOverlay} />
            <View style={styles.partnerContent}>
              <Text style={styles.partnerTitle}>Are You a Turf Owner?</Text>
              <Text style={styles.partnerDesc}>
                Partner with us to get 10x more bookings and manage your facility seamlessly.
              </Text>
              <View style={[styles.joinBtn, { backgroundColor: C.primary }]}>
                <Text style={styles.joinBtnText}>List Your Turf</Text>
              </View>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      <FilterBottomSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleApplyFilter}
        initialFilters={activeFilters}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 10,
  },
  greetingText: {
    ...FONT.caption,
    fontSize: 13,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  locationText: {
    ...FONT.h3,
    fontSize: 15,
    fontWeight: '800',
    maxWidth: 240,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeDot: {
    position: 'absolute',
    top: 10,
    right: 11,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    marginTop: 14,
    gap: 8,
  },
  quickCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
  },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickTitle: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  sportsSection: {
    marginTop: 22,
  },
  section: {
    marginTop: 22,
  },
  matchBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: 22,
    borderRadius: RADIUS.xxl,
    padding: 18,
  },
  matchBannerContent: {},
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
    marginBottom: 8,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#F59E0B',
    letterSpacing: 0.5,
  },
  matchBannerTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 4,
  },
  matchBannerSub: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 14,
  },
  matchBannerBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: RADIUS.round,
  },
  matchBannerBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  partnerBanner: {
    marginHorizontal: SPACING.lg,
    marginTop: 24,
    borderRadius: RADIUS.xxl,
    overflow: 'hidden',
    height: 150,
  },
  partnerBg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  partnerOverlay: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
  },
  partnerContent: {
    padding: 18,
  },
  partnerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  partnerDesc: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 4,
    maxWidth: 240,
    lineHeight: 16,
  },
  joinBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.round,
    marginTop: 10,
  },
  joinBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  permContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  permIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  permTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  permSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 28,
  },
  allowBtn: {
    width: '100%',
    height: 52,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  allowBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  skipBtn: {
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});