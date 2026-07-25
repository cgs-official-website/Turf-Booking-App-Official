import React, { useEffect, useState } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Dimensions, Platform,
  Linking, Share, StatusBar,
} from 'react-native';
import { StyleSheet } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { turfsApi } from '../api/turfs';
import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
import { SPACING, RADIUS } from '../utils/theme';
import Icon from 'react-native-vector-icons/Ionicons';
import MIcon from 'react-native-vector-icons/MaterialCommunityIcons';
import useTheme from '../hooks/useTheme';

const { width } = Dimensions.get('window');
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';
const FF = Platform.OS === 'ios' ? 'System' : 'sans-serif';

const TXT = {
  display: { fontFamily: FF, fontSize: 32, fontWeight: '800', letterSpacing: -0.8 },
  h1:      { fontFamily: FF, fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
  h2:      { fontFamily: FF, fontSize: 17, fontWeight: '700', letterSpacing: -0.2 },
  h3:      { fontFamily: FF, fontSize: 15, fontWeight: '600' },
  body:    { fontFamily: FF, fontSize: 14, fontWeight: '400', lineHeight: 21 },
  caption: { fontFamily: FF, fontSize: 13, fontWeight: '400', lineHeight: 19 },
  label:   { fontFamily: FF, fontSize: 13, fontWeight: '600' },
  button:  { fontFamily: FF, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
};

const AMENITY_ICONS = {
  Floodlights: 'lightbulb-on-outline',
  Parking:     'parking',
  CCTV:        'cctv',
  Washroom:    'human-male-female',
  Water:       'cup-water',
  Seating:     'sofa-outline',
};
const SPORT_ICONS = {
  Football:   'soccer',
  Cricket:    'cricket',
  Badminton:  'badminton',
  Tennis:     'tennis',
  Basketball: 'basketball',
  Volleyball: 'volleyball',
};

const openMap = (address, lat, lng) => {
  const url = (lat && lng)
    ? Platform.select({
        ios:     `maps://app?ll=${lat},${lng}&q=${encodeURIComponent(address)}`,
        android: `geo:${lat},${lng}?q=${encodeURIComponent(address)}`,
      })
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  Linking.openURL(url).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`)
  );
};

const shareTurf = async (turf) => {
  try {
    await Share.share({
      title:   turf.name,
      message: `🏟️ ${turf.name}\n📍 ${turf.location?.address}\n💰 ₹${turf.pricePerHour}/hour\n\nBook your slot now on TurfApp!`,
    });
  } catch (e) {}
};

// ── Active Bookings Orange Message ─────
function ActiveBookingsBanner({ count = 0 }) {
  if (!count) return null;
  return (
    <Text style={ab.msg}>{count} Teams booked online recently</Text>
  );
}

const ab = StyleSheet.create({
  msg: { fontSize: 13, fontWeight: '600', color: '#F97316',
         textAlign: 'center', marginTop: SPACING.sm },
});

// ── Hero Image with fallback ─────────────────────────────────────────
// FIX: if backend URL is missing/misconfigured or the image genuinely
// 404s, this now falls back to PLACEHOLDER_IMG instead of showing a
// blank box + console WARN spam every time.
function HeroImage({ uri, style }) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      source={{ uri: failed || !uri ? PLACEHOLDER_IMG : uri }}
      style={style}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TurfDetailScreen({ route, navigation }) {
  const id = route.params?.turfId ?? route.params?.id;

  const dispatch    = useDispatch();
  const { C, dark } = useTheme();
  const wishlist    = useSelector((s) => s.wishlist.wishlist);

  const [turf,     setTurf]     = useState(null);
  const [reviews,  setReviews]  = useState([]);
  const [imgIndex, setImgIndex] = useState(0);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([turfsApi.getTurf(id), turfsApi.getReviews(id)])
      .then(([t, r]) => { setTurf(t.turf); setReviews(r.reviews); })
      .finally(() => setLoading(false));
    dispatch(fetchWishlist());
  }, [id]);

  if (loading || !turf) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
      </View>
    );
  }

  const isWishlisted = wishlist.some((t) => t._id === turf._id);
  const images       = turf.images?.length ? turf.images : [PLACEHOLDER_IMG];
  const lat          = turf.location?.lat  || turf.location?.latitude  || null;
  const lng          = turf.location?.lng  || turf.location?.longitude || null;
  const address      = turf.location?.address || '';
  const activeCount  = turf.activeBookings || turf.recentBookings || 0;

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>

        {/* ── Hero ── */}
        <View style={styles.heroWrap}>
          <FlatList
            data={images}
            horizontal pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) =>
              setImgIndex(Math.round(e.nativeEvent.contentOffset.x / (width - SIDE_PAD * 2)))
            }
            keyExtractor={(_, i) => String(i)}
            renderItem={({ item }) => (
              <HeroImage uri={item} style={[styles.heroImage, { backgroundColor: C.bgSoft }]} />
            )}
          />
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={20} color="#1a1a1a" />
          </TouchableOpacity>
          <View style={styles.rightBtns}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => dispatch(toggleWishlist(turf))}>
              <Icon name={isWishlisted ? 'heart' : 'heart-outline'} size={20} color={isWishlisted ? C.red : '#1a1a1a'} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.iconBtn, { marginTop: 10 }]} onPress={() => shareTurf(turf)}>
              <Icon name="share-social-outline" size={20} color="#1a1a1a" />
            </TouchableOpacity>
          </View>
          <View style={styles.dots}>
            {images.map((_, i) => (
              <View key={i} style={[styles.dot, i === imgIndex && styles.dotActive]} />
            ))}
          </View>
        </View>

        {/* ── Body ── */}
        <View style={styles.body}>

          {/* Title + Rating */}
          <View style={styles.titleRow}>
            <Text style={[TXT.h1, { flex: 1, color: C.text }]} numberOfLines={2}>{turf.name}</Text>
            <View style={styles.ratingPill}>
              <Icon name="star" size={14} color={C.yellow} />
              <Text style={[TXT.h3, { color: C.text, marginLeft: 3 }]}>{turf.rating?.toFixed(1) || 'New'}</Text>
              <Text style={[TXT.caption, { color: C.subtext, marginLeft: 2 }]}>({turf.reviewsCount})</Text>
            </View>
          </View>

          {/* ── Location + View on map — same row ── */}
          <View style={styles.locRow}>
            <Icon name="location-outline" size={14} color={C.subtext} />
            <Text style={[TXT.caption, { color: C.subtext, flex: 1 }]} numberOfLines={1}>{address}</Text>
            <TouchableOpacity
              style={[styles.mapChip, { backgroundColor: C.primaryLight }]}
              onPress={() => openMap(address, lat, lng)}
            >
              <Icon name="map-outline" size={13} color={C.primary} />
              <Text style={[TXT.label, { color: C.primary, marginLeft: 3 }]}>View on map</Text>
              <Icon name="chevron-forward" size={13} color={C.primary} />
            </TouchableOpacity>
          </View>

          {/* ── Price — centered, big & visible ── */}
          <View style={styles.priceRow}>
            <Text style={[TXT.display, { color: C.primary }]}>
              ₹{turf.pricePerHour}
            </Text>
            <Text style={[TXT.body, { color: C.subtext, alignSelf: 'flex-end', marginBottom: 6, marginLeft: 4 }]}>
              /hour
            </Text>
          </View>

          {!!turf.specs && (
            <Text style={[TXT.body, { color: C.subtext, marginTop: SPACING.xs }]}>{turf.specs}</Text>
          )}

          {/* ── Active Bookings Orange Banner ── */}
          <ActiveBookingsBanner count={activeCount} />

          {/* ── Available Sport ── */}
          <Text style={[TXT.h2, { color: C.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>
            Available sport
          </Text>
          <View style={styles.chipRow}>
            {turf.sports.map((s) => (
              <View key={s} style={[styles.sportBox, { borderColor: C.border, backgroundColor: C.bgSoft }]}>
                <MIcon name={SPORT_ICONS[s] || 'trophy-outline'} size={30} color={C.text} />
                <Text style={[TXT.label, { color: C.text, marginTop: 8 }]}>{s}</Text>
              </View>
            ))}
          </View>

          {/* ── Amenities ── */}
          <Text style={[TXT.h2, { color: C.text, marginTop: SPACING.xl, marginBottom: SPACING.md }]}>
            Amenities
          </Text>
          <View style={styles.amenityGrid}>
            {turf.amenities.map((a) => (
              <View key={a} style={[styles.amenityBox, { borderColor: C.border, backgroundColor: C.bgSoft }]}>
                <MIcon name={AMENITY_ICONS[a] || 'check-circle-outline'} size={26} color={C.primary} />
                <Text style={[TXT.caption, { color: C.text, fontWeight: '600', marginTop: 6, textAlign: 'center' }]}>
                  {a}
                </Text>
              </View>
            ))}
          </View>

          {/* ── Reviews ── */}
          <View style={[styles.sectionHeaderRow, { marginTop: SPACING.xl }]}>
            <Text style={[TXT.h2, { color: C.text, marginBottom: SPACING.md }]}>Reviews</Text>
            {reviews.length > 0 && (
              <Text style={[TXT.caption, { color: C.subtext }]}>{reviews.length} reviews</Text>
            )}
          </View>
          {reviews.length === 0 ? (
            <Text style={[TXT.body, { color: C.subtext }]}>No reviews yet. Be the first to play & review!</Text>
          ) : (
            reviews.slice(0, 3).map((rv) => (
              <View key={rv._id} style={[styles.reviewCard, { borderColor: C.border, backgroundColor: C.bgSoft }]}>
                <View style={styles.reviewHeader}>
                  <Text style={[TXT.h3, { color: C.text }]}>{rv.user?.name || 'Player'}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                    <Icon name="star" size={12} color={C.yellow} />
                    <Text style={[TXT.label, { color: C.text }]}>{rv.rating}</Text>
                  </View>
                </View>
                {!!rv.comment && (
                  <Text style={[TXT.body, { color: C.subtext, marginTop: 5 }]}>{rv.comment}</Text>
                )}
              </View>
            ))
          )}

          <View style={{ height: 110 }} />
        </View>
      </ScrollView>

      {/* ── Book Now Footer ── */}
      <View style={[styles.footer, { backgroundColor: C.bg, borderTopColor: C.border }]}>
        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: C.primary }]}
          onPress={() => navigation.navigate('SlotPicker', { turf: { ...turf, _id: turf._id || turf.id } })}
          activeOpacity={0.88}
        >
          <Text style={[TXT.button, { color: '#fff' }]}>Book Now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const CARD_GAP  = 12;
const SIDE_PAD  = SPACING.lg;
const BOX_WIDTH = (width - SIDE_PAD * 2 - CARD_GAP * 2) / 3;

const styles = StyleSheet.create({
  container:        { flex: 1 },
  loadingBox:       { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heroWrap:         { position: 'relative', paddingHorizontal: SIDE_PAD, paddingTop: SPACING.xxl + 12 },
  heroImage:        { width: width - SIDE_PAD * 2, height: 220, borderRadius: RADIUS.xl },
  backBtn:          { position: 'absolute', top: SPACING.xxl + 24, left: SIDE_PAD + 12, width: 40, height: 40,
                      borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.92)',
                      justifyContent: 'center', alignItems: 'center' },
  rightBtns:        { position: 'absolute', top: SPACING.xxl + 24, right: SIDE_PAD + 12, alignItems: 'center' },
  iconBtn:          { width: 40, height: 40, borderRadius: 20,
                      backgroundColor: 'rgba(255,255,255,0.92)',
                      justifyContent: 'center', alignItems: 'center' },
  dots:             { position: 'absolute', bottom: 14, width: '100%',
                      flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot:              { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.5)' },
  dotActive:        { width: 22, height: 7, borderRadius: 4, backgroundColor: '#fff' },

  body:             { paddingHorizontal: SIDE_PAD, paddingTop: SPACING.lg },
  titleRow:         { flexDirection: 'row', justifyContent: 'space-between',
                      alignItems: 'flex-start', gap: 8 },
  ratingPill:       { flexDirection: 'row', alignItems: 'center', marginTop: 4, flexShrink: 0 },

  locRow:           { flexDirection: 'row', alignItems: 'center', gap: 5,
                      marginTop: 8, flexWrap: 'nowrap' },
  mapChip:          { flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.round, flexShrink: 0 },

  // ── Price — row so /hour aligns to baseline ──
  priceRow:         { flexDirection: 'row', alignItems: 'flex-end', marginTop: SPACING.md },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  chipRow:          { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  sportBox:         { width: BOX_WIDTH, minHeight: 100, borderWidth: 1.5, borderRadius: RADIUS.lg,
                      paddingVertical: SPACING.lg, alignItems: 'center', justifyContent: 'center' },
  amenityGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  amenityBox:       { width: BOX_WIDTH, minHeight: 90, borderWidth: 1.5, borderRadius: RADIUS.lg,
                      paddingVertical: SPACING.md, paddingHorizontal: 6,
                      alignItems: 'center', justifyContent: 'center' },
  reviewCard:       { borderWidth: 1, borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm },
  reviewHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footer:           { position: 'absolute', bottom: 0, left: 0, right: 0,
                      paddingHorizontal: SIDE_PAD, paddingTop: SPACING.md,
                      paddingBottom: SPACING.xl, borderTopWidth: 1 },
  bookBtn:          { paddingVertical: 16, borderRadius: RADIUS.xl, alignItems: 'center' },
});