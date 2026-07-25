import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
  ScrollView, RefreshControl, StatusBar, ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Geolocation from '@react-native-community/geolocation';
import { turfsApi }           from '../api/turfs';
import { notificationsApi }   from '../api/notifications';
import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
import { setLocationPermission  }         from '../redux/authSlice';
import { setLocation } from '../redux/authSlice';
import { COLORS, SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';
import useTheme from '../hooks/useTheme'; // <-- Hook Import panyachu
import Icon from 'react-native-vector-icons/Ionicons';
import FilterBottomSheet from './FilterBottomSheet';

const SPORTS = [
  { name: 'Football',   icon: require('../assets/football.png')   },
  { name: 'Cricket',    icon: require('../assets/cricket.png')    },
  { name: 'Badminton',  icon: require('../assets/badminton.png')  },
  { name: 'Tennis',     icon: require('../assets/tennis.png')     },
  { name: 'Basketball', icon: require('../assets/basketball.png') },
  { name: 'Volleyball', icon: require('../assets/volleyball.png') },
];
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';
const { width } = Dimensions.get('window');

// ─── Location Permission Screen ───────────────────────────────────────────────
function LocationPermissionView({ C }) {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);

  // ✅ Fix - reverse geocode பண்ணி city name வாங்கு:
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
        dispatch(setLocationPermission(cityName)); // city name!
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
      <Image
        source={require('../assets/location.png')}
        style={styles.illustrationBox}
        resizeMode="contain"
      />
      <Text style={[styles.permTitle, { color: C.text }]}>Allow Your Location</Text>
      <Text style={[styles.permSubtitle, { color: C.subtext }]}>
        We will use your location to recommend local turfs for your better experience
      </Text>
      <TouchableOpacity
        style={[styles.allowBtn, { backgroundColor: C.primary }, loading && { opacity: 0.7 }]}
        onPress={handleAllow}
        disabled={loading}
        activeOpacity={0.85}
      >
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.allowBtnText}>Allow Your Location</Text>
        }
      </TouchableOpacity>
      <TouchableOpacity onPress={handleSkip} style={styles.skipBtn} activeOpacity={0.7}>
        <Text style={[styles.skipText, { color: C.subtext }]}>May be later</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Main HomeScreen ──────────────────────────────────────────────────────────
export default function HomeScreen({ navigation }) {
  const dispatch  = useDispatch();
  const { C, dark } = useTheme(); // <-- Dynamic themes extract panniyachu

  const user      = useSelector((s) => s.auth.user);
  const wishlist  = useSelector((s) => s.wishlist.wishlist);
  const locationPermissionGranted = useSelector((s) => s.auth.locationPermissionGranted);
  const location        = useSelector((s) => s.auth.location);
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
      // ── FIX: filter the turf list by whatever location the user picked on
      // LocationScreen (Google Places result or a top-location tap). Skip
      // when it's the raw "Current Location" fallback string (GPS lookup
      // failed) since that text won't match any real address/city. ──
      if (location && location !== 'Current Location') params.location = location;
      const res = await turfsApi.getTurfs(params);
      setTurfs(res.turfs);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [sport, activeFilters, location]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    dispatch(fetchWishlist());
  }, []);

  // ── FIX: unread count is now refetched every time HomeScreen comes back
  // into focus (e.g. returning from NotificationsScreen after marking all
  // as read), instead of only once on initial mount. Previously the red
  // dot stayed forever since `unread` state was never updated again.
  useFocusEffect(
    useCallback(() => {
      notificationsApi.getAll().then((r) => setUnread(r.unreadCount)).catch(() => {});
    }, [])
  );

  const handleApplyFilter = (filters) => {
    setActiveFilters(filters);
  };

  const hasActiveFilter = !!(activeFilters.sort || activeFilters.time);

  if (!locationPermissionGranted) {
    return (
      <View style={[styles.container, { backgroundColor: C.bg }]}>
        <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={C.bg} />
        <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
          <LocationPermissionView C={C} />
        </SafeAreaView>
      </View>
    );
  }

  const isWishlisted = (id) => wishlist.some((t) => t._id === id);
  const sorted   = [...turfs].sort((a, b) => (b.rating || 0) - (a.rating || 0));
const featured = sorted[0];  // highest rated turf
const nearby   = sorted.slice(1);  // rest of turfs

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} backgroundColor={C.bg} translucent={false} />

      <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} colors={[C.primary]} />}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.greeting, { color: C.text }]}>
                Welcome back, {user?.name?.split(' ')[0] || 'Player'}
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Location')}>
  <Text style={[styles.locationText, { color: C.primary }]}>
    {user?.location?.address || location || 'Set your location'} {'>'}
  </Text>
</TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.bellBtn, { backgroundColor: C.bgSoft }]}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Icon name="notifications-outline" size={22} color={C.text} />
              {unread > 0 && <View style={styles.badge} />}
            </TouchableOpacity>
          </View>

          {/* ── Search bar ── */}
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: C.bgSoft, borderColor: C.border }]}
            onPress={() => navigation.navigate('Explore')}
            activeOpacity={0.8}
          >
            <Icon name="search" size={18} color={C.subtext} />
            <Text style={[styles.searchPlaceholder, { color: C.subtext }]}>Search turf, sport or location</Text>
            <TouchableOpacity
              style={styles.filterIconWrap}
              onPress={() => setFilterVisible(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="options-outline" size={18} color={C.primary} />
              {hasActiveFilter && <View style={styles.filterDot} />}
            </TouchableOpacity>
          </TouchableOpacity>

          {/* ── Sport chips ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.sportRow}
            contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.lg }}
          >
            {SPORTS.map((s) => (
              <TouchableOpacity
                key={s.name}
                style={[
                  styles.sportChip,
                  { backgroundColor: C.card, borderColor: C.border },
                  sport === s.name && { backgroundColor: C.primary, borderColor: C.primary }
                ]}
                onPress={() => setSport(sport === s.name ? null : s.name)}
              >
                <Image source={s.icon} style={styles.sportChipIcon} />
                <Text style={[styles.sportChipText, { color: C.text }, sport === s.name && { color: '#fff' }]}>
                  {s.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── Featured turf ── */}
          {featured && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: C.text }]}>Featured Turf</Text>
              <TouchableOpacity
                style={[styles.featuredCard, { backgroundColor: C.card, borderColor: C.border }]}
                onPress={() => navigation.navigate('TurfDetail', { id: featured._id })}
                activeOpacity={0.92}
              >
                <Image
                  source={{ uri: featured.images?.[0] || PLACEHOLDER_IMG }}
                  style={[styles.featuredImage, { backgroundColor: C.bgSoft }]}
                />
                <TouchableOpacity
                  style={styles.heartBtn}
                  onPress={() => dispatch(toggleWishlist(featured))}
                >
                  <Icon
                    name={isWishlisted(featured._id) ? 'heart' : 'heart-outline'}
                    size={18}
                    color={isWishlisted(featured._id) ? COLORS.red : '#1A1A1A'}
                  />
                </TouchableOpacity>
                <View style={styles.featuredBody}>
                  <View style={styles.titleRow}>
                    <Text style={[styles.cardTitle, { color: C.text }]} numberOfLines={1}>{featured.name}</Text>
                    <View style={styles.ratingBadge}>
                      <Icon name="star" size={13} color={COLORS.yellow} />
                      <Text style={[styles.ratingText, { color: C.text }]}>
                        {featured.rating?.toFixed(1) || 'New'}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.locationSub, { color: C.subtext }]}>
                    {featured.location.city}, {featured.location.state}
                  </Text>
                  <View style={styles.priceRow}>
                    <View>
                      <Text style={[styles.priceLabel, { color: C.subtext }]}>Starts from</Text>
                      <Text style={[styles.priceValue, { color: C.primary }]}>
                        ₹{featured.pricePerHour}
                        <Text style={[styles.priceUnit, { color: C.subtext }]}>/hour</Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.bookButton, { backgroundColor: C.primary }]}
                      onPress={() => navigation.navigate('TurfDetail', { id: featured._id })}
                    >
                      <Text style={styles.bookButtonText}>Book Now</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Nearby You ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: C.text, paddingHorizontal: 0, marginBottom: 0 }]}>Nearby You</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Explore')}>
                <Text style={[styles.seeAll, { color: C.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={nearby}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item._id}
              contentContainerStyle={{ paddingHorizontal: SPACING.lg, gap: SPACING.md }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.nearbyCard, { backgroundColor: C.card, borderColor: C.border }]}
                  onPress={() => navigation.navigate('TurfDetail', { id: item._id })}
                  activeOpacity={0.92}
                >
                  <Image
                    source={{ uri: item.images?.[0] || PLACEHOLDER_IMG }}
                    style={[styles.nearbyImage, { backgroundColor: C.bgSoft }]}
                  />
                  <TouchableOpacity
                    style={styles.heartBtnSm}
                    onPress={() => dispatch(toggleWishlist(item))}
                  >
                    <Icon
                      name={isWishlisted(item._id) ? 'heart' : 'heart-outline'}
                      size={15}
                      color={isWishlisted(item._id) ? COLORS.red : '#1A1A1A'}
                    />
                  </TouchableOpacity>
                  <View style={styles.nearbyBody}>
                    <View style={styles.titleRow}>
                      <Text style={[styles.nearbyTitle, { color: C.text }]} numberOfLines={1}>{item.name}</Text>
                      <View style={styles.ratingBadge}>
                        <Icon name="star" size={12} color={COLORS.yellow} />
                        <Text style={[styles.ratingTextSm, { color: C.text }]}>
                          {item.rating?.toFixed(1) || 'New'}
                        </Text>
                      </View>
                    </View>
                    <Text style={[styles.nearbySub, { color: C.subtext }]} numberOfLines={1}>{item.location.city}</Text>
                    <View style={styles.priceRow}>
                      <Text style={[styles.nearbyPrice, { color: C.text }]}>₹{item.pricePerHour}/hr</Text>
                      <TouchableOpacity
                        style={[styles.bookOutline, { borderColor: C.primary }]}
                        onPress={() => navigation.navigate('TurfDetail', { id: item._id })}
                      >
                        <Text style={[styles.bookOutlineText, { color: C.primary }]}>Book</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>

          {/* ── Partner Banner ── */}
          <TouchableOpacity style={styles.partnerBanner} activeOpacity={0.9}>
            <Image
              source={require('../assets/background1.png')}
              style={styles.partnerBg}
              resizeMode="cover"
            />
            <View style={styles.partnerOverlay} />
            <View style={styles.partnerContent}>
              <Text style={styles.partnerTitle}>Partner with us</Text>
              <Text style={styles.partnerDesc}>
                List your turf on Namma Ooru Turf and reach more players. Earn money.
              </Text>
              <View style={[styles.joinBtn, { backgroundColor: C.primary }]}>
                <Text style={styles.joinBtnText}>Join now</Text>
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
  // Style values remain exact, object background colors are dynamically loaded inline above!
  container:          { flex: 1 },
  permContainer:      { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xl },
  illustrationBox:    { width: width * 0.6, height: width * 0.6, marginBottom: SPACING.xl },
  permTitle:          { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: SPACING.md },
  permSubtitle:       { fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: SPACING.xl * 1.5, paddingHorizontal: SPACING.md },
  allowBtn:           { width: '100%', borderRadius: RADIUS.round, paddingVertical: 16, alignItems: 'center', marginBottom: SPACING.lg },
  allowBtnText:       { color: '#fff', fontWeight: '700', fontSize: 16 },
  skipBtn:            { paddingVertical: SPACING.sm },
  skipText:           { fontSize: 14, fontWeight: '500' },
  header:             { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm },
  greeting:           { ...FONT.h3, fontSize: 16 },
  locationText:       { fontWeight: '600', fontSize: 13, marginTop: 2 },
  bellBtn:            { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  badge:              { position: 'absolute', top: 8, right: 9, width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red },
  searchBar:          { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.lg, marginTop: SPACING.sm, paddingHorizontal: SPACING.md, paddingVertical: 13, borderRadius: RADIUS.lg, gap: SPACING.sm, borderWidth: 1 },
  searchPlaceholder:  { flex: 1, fontSize: 14 },
  filterIconWrap:     { position: 'relative' },
  filterDot:          { position: 'absolute', top: -3, right: -3, width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.red },
  sportRow:           { marginTop: SPACING.lg },
  sportChip:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.round, borderWidth: 1, gap: 6 },
  sportChipIcon:      { width: 18, height: 18, resizeMode: 'contain' },
  sportChipText:      { fontWeight: '600', fontSize: 13 },
  section:            { marginTop: SPACING.xl },
  sectionHeaderRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  sectionTitle:       { ...FONT.h3, paddingHorizontal: SPACING.lg, marginBottom: SPACING.md },
  seeAll:             { fontWeight: '600', fontSize: 13 },
  featuredCard:       { marginHorizontal: SPACING.lg, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, ...SHADOW.card },
  featuredImage:      { width: '100%', height: 200 },
  heartBtn:           { position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center' },
  featuredBody:       { padding: SPACING.lg },
  titleRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle:          { ...FONT.h3, flexShrink: 1, fontSize: 15 },
  ratingBadge:        { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingText:         { fontWeight: '700', fontSize: 13 },
  ratingTextSm:       { fontWeight: '700', fontSize: 11 },
  locationSub:        { fontSize: 13, marginTop: 4 },
  priceRow:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: SPACING.md },
  priceLabel:         { fontSize: 11 },
  priceValue:         { fontSize: 22, fontWeight: '800' },
  priceUnit:          { fontSize: 13, fontWeight: '400' },
  bookButton:         { paddingHorizontal: SPACING.lg, paddingVertical: 11, borderRadius: RADIUS.md },
  bookButtonText:     { color: '#fff', fontWeight: '700', fontSize: 13 },
  heartBtnSm:         { position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.92)', justifyContent: 'center', alignItems: 'center' },
  nearbyCard:         { width: 190, borderRadius: RADIUS.lg, overflow: 'hidden', borderWidth: 1, ...SHADOW.card },
  nearbyImage:        { width: '100%', height: 115 },
  nearbyBody:         { padding: SPACING.md },
  nearbyTitle:        { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  nearbySub:          { fontSize: 12, marginTop: 2 },
  nearbyPrice:        { fontWeight: '700', fontSize: 13 },
  bookOutline:        { borderWidth: 1, paddingHorizontal: SPACING.sm, paddingVertical: 4, borderRadius: RADIUS.sm },
  bookOutlineText:    { fontWeight: '700', fontSize: 12 },
  partnerBanner:      { marginHorizontal: SPACING.lg, marginTop: SPACING.xl, marginBottom: SPACING.xxl, borderRadius: RADIUS.lg, overflow: 'hidden', height: 160 },
  partnerBg:          { position: 'absolute', width: '100%', height: '100%' },
  partnerOverlay:     { position: 'absolute', width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.30)' },
  partnerContent:     { padding: SPACING.xl },
  partnerTitle:       { color: '#fff', fontSize: 20, fontWeight: '800' },
  partnerDesc:        { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 6, lineHeight: 18 },
  joinBtn:            { alignSelf: 'flex-start', paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.md, marginTop: SPACING.md },
  joinBtnText:        { color: '#fff', fontWeight: '700', fontSize: 13 },
});