import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity,
  ActivityIndicator, FlatList, Dimensions, Platform,
  Linking, Share, StatusBar, StyleSheet, Modal,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { turfsApi } from '../api/turfs';
import { fetchWishlist, toggleWishlist } from '../redux/wishlistSlice';
import useTheme from '../hooks/useTheme';
import { RatingBadge } from '../components/RatingBadge';
import { getSportIconComponent } from '../components/SportChip';
import { getImageUrl } from '../api/client';
import { SPACING, RADIUS, FONT, SHADOW } from '../utils/theme';

const { width, height } = Dimensions.get('window');
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';

const AMENITY_CONFIG = {
  'FIFA Approved Turf': { icon: 'award', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  Floodlights:          { icon: 'sun', color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.12)' },
  Parking:              { icon: 'truck', color: '#3B82F6', bg: 'rgba(59, 130, 246, 0.12)' },
  'Locker Room':        { icon: 'lock', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  'Changing Rooms':     { icon: 'user-check', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  Showers:              { icon: 'droplet', color: '#06B6D4', bg: 'rgba(6, 182, 212, 0.12)' },
  'Mineral Water':      { icon: 'coffee', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' },
  'Water Dispenser':    { icon: 'coffee', color: '#0EA5E9', bg: 'rgba(14, 165, 233, 0.12)' },
  Cafeteria:            { icon: 'coffee', color: '#EC4899', bg: 'rgba(236, 72, 153, 0.12)' },
  Dugout:               { icon: 'shield', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  CCTV:                 { icon: 'video', color: '#64748B', bg: 'rgba(100, 116, 139, 0.12)' },
  'First Aid':          { icon: 'plus-circle', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)' },
  'Cricket Nets':       { icon: 'grid', color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' },
  'Bowling Machine':    { icon: 'zap', color: '#EAB308', bg: 'rgba(234, 179, 8, 0.12)' },
  'Badminton Courts':   { icon: 'activity', color: '#8B5CF6', bg: 'rgba(139, 92, 246, 0.12)' },
  'Tennis Court':       { icon: 'circle', color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)' },
  'Basketball Court':   { icon: 'disc', color: '#F97316', bg: 'rgba(249, 115, 22, 0.12)' },
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
    const price = turf.pricing?.baseRate || turf.price || turf.pricePerHour || 800;
    await Share.share({
      title: turf.name,
      message: `🏟️ ${turf.name}\n📍 ${turf.address || turf.location?.address || turf.city || 'Tamil Nadu'}\n💰 ₹${price}/hour\n\nBook your slot now on Turf Booking App!`,
    });
  } catch (e) {}
};

export default function TurfDetailScreen({ route, navigation }) {
  const id = route.params?.turfId ?? route.params?.id;

  const dispatch    = useDispatch();
  const { C, dark } = useTheme();
  const wishlist    = useSelector((s) => s.wishlist.wishlist || []);

  const [turf,          setTurf]          = useState(null);
  const [reviews,       setReviews]       = useState([]);
  const [imgIndex,      setImgIndex]      = useState(0);
  const [modalVisible,  setModalVisible]  = useState(false);
  const [modalIndex,    setModalIndex]    = useState(0);
  const [loading,       setLoading]       = useState(true);

  const sliderRef      = useRef(null);
  const modalSliderRef = useRef(null);

  useEffect(() => {
    Promise.all([turfsApi.getTurf(id), turfsApi.getReviews(id)])
      .then(([t, r]) => {
        setTurf(t?.turf || t);
        setReviews(r?.reviews || r?.items || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    dispatch(fetchWishlist());
  }, [id, dispatch]);

  if (loading || !turf) {
    return (
      <View style={[styles.loadingBox, { backgroundColor: C.bg }]}>
        <ActivityIndicator color={C.primary} size="large" />
        <Text style={[styles.loadingText, { color: C.subtext }]}>Loading arena details...</Text>
      </View>
    );
  }

  const isWishlisted = wishlist.some((t) => (t._id || t.id) === (turf._id || turf.id));
  const rawImages    = (Array.isArray(turf.images) && turf.images.length > 0) ? turf.images : (turf.image ? [turf.image] : [PLACEHOLDER_IMG]);
  const images       = rawImages.map(getImageUrl);
  const lat          = turf.location?.lat  || turf.location?.latitude  || null;
  const lng          = turf.location?.lng  || turf.location?.longitude || null;
  const city         = turf.city || turf.location?.city || 'Chennai';
  const address      = turf.address || turf.location?.address || `${city}, Tamil Nadu`;
  const sports       = turf.sportTypes || turf.sports || ['Football', 'Cricket'];
  const amenities    = turf.amenities || ['FIFA Approved Turf', 'Floodlights', 'Parking', 'Mineral Water'];
  const pricePerHour = turf.pricing?.baseRate || turf.price || turf.pricePerHour || 800;
  const ratingAvg    = typeof turf.rating === 'object' ? (turf.rating.avg || 4.8) : (Number(turf.rating) || 4.8);
  const reviewCount  = typeof turf.rating === 'object' ? (turf.rating.count || reviews.length || 24) : (turf.reviewsCount || reviews.length || 24);
  const openTiming   = turf.slotConfig ? `${turf.slotConfig.openTime || '06:00'} - ${turf.slotConfig.closeTime || '23:00'}` : '06:00 - 23:00';

  const openFullscreenGallery = (index = 0) => {
    setModalIndex(index);
    setModalVisible(true);
    setTimeout(() => {
      modalSliderRef.current?.scrollToIndex({ index, animated: false });
    }, 100);
  };

  const slideNext = () => {
    if (imgIndex < images.length - 1) {
      const nextIdx = imgIndex + 1;
      sliderRef.current?.scrollToIndex({ index: nextIdx, animated: true });
      setImgIndex(nextIdx);
    }
  };

  const slidePrev = () => {
    if (imgIndex > 0) {
      const prevIdx = imgIndex - 1;
      sliderRef.current?.scrollToIndex({ index: prevIdx, animated: true });
      setImgIndex(prevIdx);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* ── Hero Image Slider Section ── */}
        <View style={styles.heroOuterWrap}>
          <View style={styles.heroWrap}>
            <FlatList
              ref={sliderRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width}
              decelerationRate="fast"
              onMomentumScrollEnd={(e) => {
                const newIndex = Math.round(e.nativeEvent.contentOffset.x / width);
                setImgIndex(newIndex);
              }}
              keyExtractor={(_, i) => String(i)}
              renderItem={({ item, index }) => (
                <TouchableOpacity
                  activeOpacity={0.92}
                  onPress={() => openFullscreenGallery(index)}
                  style={styles.heroImageTouchable}
                >
                  <Image source={{ uri: item }} style={styles.heroImage} resizeMode="cover" />
                </TouchableOpacity>
              )}
            />

            {/* Floating Top Navbar Row (Back on left, Heart & Share side-by-side on right) */}
            <View style={styles.floatingTopBar}>
              <TouchableOpacity
                style={styles.floatingBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.8}
              >
                <Feather name="arrow-left" size={20} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={styles.floatingRightRow}>
                <TouchableOpacity
                  style={styles.floatingBtn}
                  onPress={() => dispatch(toggleWishlist(turf))}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={isWishlisted ? 'heart' : 'heart-outline'}
                    size={22}
                    color={isWishlisted ? '#EF4444' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.floatingBtn}
                  onPress={() => shareTurf(turf)}
                  activeOpacity={0.8}
                >
                  <Feather name="share-2" size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Slider Arrow Navigation Controls */}
            {images.length > 1 && (
              <>
                {imgIndex > 0 && (
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowLeft]}
                    onPress={slidePrev}
                    activeOpacity={0.75}
                  >
                    <Feather name="chevron-left" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                {imgIndex < images.length - 1 && (
                  <TouchableOpacity
                    style={[styles.arrowBtn, styles.arrowRight]}
                    onPress={slideNext}
                    activeOpacity={0.75}
                  >
                    <Feather name="chevron-right" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Bottom Hero Overlay: Premium Photo Counter Badge & Centered Dots */}
            <View style={styles.bottomHeroOverlay}>
              <View style={{ width: 60 }} />

              {/* Centered Pagination Dots */}
              <View style={styles.paginationDotsCenter}>
                {images.map((_, i) => (
                  <TouchableOpacity
                    key={i}
                    onPress={() => {
                      sliderRef.current?.scrollToIndex({ index: i, animated: true });
                      setImgIndex(i);
                    }}
                    activeOpacity={0.8}
                    style={[
                      styles.dot,
                      i === imgIndex ? styles.dotActive : styles.dotInactive,
                    ]}
                  />
                ))}
              </View>

              {/* Elegant Modern Photo Count Pill */}
              <View style={styles.photoCountPill}>
                <Ionicons name="images-outline" size={13} color="#10B981" style={{ marginRight: 5 }} />
                <Text style={styles.photoCountCurrent}>{imgIndex + 1}</Text>
                <Text style={styles.photoCountDivider}> / </Text>
                <Text style={styles.photoCountTotal}>{images.length}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Main Content Body ── */}
        <View style={styles.contentWrap}>
          {/* Top Badge & Rating Strip */}
          <View style={styles.badgeRow}>
            <View style={[styles.verifiedPill, { backgroundColor: 'rgba(16, 185, 129, 0.14)' }]}>
              <Feather name="check-circle" size={13} color="#10B981" style={{ marginRight: 5 }} />
              <Text style={styles.verifiedText}>Verified Pitch Partner</Text>
            </View>
            <View style={[styles.ratingPill, { backgroundColor: C.card, borderColor: C.border }]}>
              <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 4 }} />
              <Text style={[styles.ratingNum, { color: C.text }]}>{ratingAvg.toFixed(1)}</Text>
              <Text style={[styles.ratingCount, { color: C.subtext }]}>({reviewCount})</Text>
            </View>
          </View>

          {/* Turf Name */}
          <Text style={[styles.turfTitle, { color: C.text }]}>{turf.name}</Text>

          {/* Quick Info Grid (3 Pillars) */}
          <View style={[styles.quickInfoGrid, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}>
            <View style={styles.infoCol}>
              <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.12)' }]}>
                <Feather name="clock" size={16} color={C.primary} />
              </View>
              <Text style={[styles.infoVal, { color: C.text }]}>{openTiming}</Text>
              <Text style={[styles.infoLabel, { color: C.subtext }]}>Open Hours</Text>
            </View>

            <View style={[styles.colDivider, { backgroundColor: C.border }]} />

            <View style={styles.infoCol}>
              <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(59, 130, 246, 0.12)' }]}>
                <Feather name="map-pin" size={16} color="#3B82F6" />
              </View>
              <Text style={[styles.infoVal, { color: C.text }]} numberOfLines={1}>{city}</Text>
              <Text style={[styles.infoLabel, { color: C.subtext }]}>Hub Location</Text>
            </View>

            <View style={[styles.colDivider, { backgroundColor: C.border }]} />

            <View style={styles.infoCol}>
              <View style={[styles.infoIconCircle, { backgroundColor: 'rgba(245, 158, 11, 0.12)' }]}>
                <Feather name="zap" size={16} color="#F59E0B" />
              </View>
              <Text style={[styles.infoVal, { color: C.text }]}>Instant</Text>
              <Text style={[styles.infoLabel, { color: C.subtext }]}>1-Click Pass</Text>
            </View>
          </View>

          {/* Location & Interactive Directions Card */}
          <TouchableOpacity
            style={[styles.mapCard, { backgroundColor: C.card, borderColor: C.border }, SHADOW.subtle]}
            onPress={() => openMap(address, lat, lng)}
            activeOpacity={0.8}
          >
            <View style={[styles.mapIconWrap, { backgroundColor: C.primaryLight }]}>
              <Feather name="navigation" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 8 }}>
              <Text style={[styles.addressText, { color: C.text }]} numberOfLines={2}>
                {address}
              </Text>
              <Text style={[styles.mapDirectionsText, { color: C.primary }]}>
                Open GPS Directions in Maps →
              </Text>
            </View>
            <Feather name="chevron-right" size={18} color={C.caption} />
          </TouchableOpacity>

          {/* ── Sports Supported ── */}
          <Text style={[styles.sectionTitle, { color: C.text }]}>Sports & Pitch Formats</Text>
          <View style={styles.sportsRow}>
            {sports.map((s, idx) => (
              <View
                key={idx}
                style={[
                  styles.sportChip,
                  { backgroundColor: C.card, borderColor: C.border },
                  SHADOW.subtle,
                ]}
              >
                {getSportIconComponent(s, 16, C.primary)}
                <Text style={[styles.sportChipText, { color: C.text }]}>{s}</Text>
              </View>
            ))}
          </View>

          {/* ── Amenities & Ground Facilities ── */}
          <Text style={[styles.sectionTitle, { color: C.text }]}>World-Class Facilities</Text>
          <View style={styles.amenitiesGrid}>
            {amenities.map((a, idx) => {
              const cfg = AMENITY_CONFIG[a] || { icon: 'check-circle', color: C.primary, bg: 'rgba(16, 185, 129, 0.12)' };
              return (
                <View
                  key={idx}
                  style={[
                    styles.amenityCard,
                    { backgroundColor: C.card, borderColor: C.border },
                    SHADOW.subtle,
                  ]}
                >
                  <View style={[styles.amenityIconBox, { backgroundColor: cfg.bg }]}>
                    <Feather name={cfg.icon} size={18} color={cfg.color} />
                  </View>
                  <Text style={[styles.amenityText, { color: C.text }]} numberOfLines={1}>
                    {a}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ── Ground Guidelines ── */}
          <Text style={[styles.sectionTitle, { color: C.text }]}>Player Guidelines</Text>
          <View style={[styles.rulesCard, { backgroundColor: C.card, borderColor: C.border }]}>
            <View style={styles.ruleItem}>
              <Feather name="check" size={15} color={C.primary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.ruleText, { color: C.subtext }]}>
                Rubber studs or turf shoes recommended. Metal spikes strictly prohibited.
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Feather name="check" size={15} color={C.primary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.ruleText, { color: C.subtext }]}>
                Report 10 minutes prior to scheduled slot for warm-up & pitch access.
              </Text>
            </View>
            <View style={styles.ruleItem}>
              <Feather name="check" size={15} color={C.primary} style={{ marginRight: 8, marginTop: 2 }} />
              <Text style={[styles.ruleText, { color: C.subtext }]}>
                Full refund or rescheduling available up to 4 hours before slot start.
              </Text>
            </View>
          </View>

          {/* ── Player Reviews & Ratings ── */}
          <View style={styles.reviewHeaderRow}>
            <Text style={[styles.sectionTitle, { color: C.text, marginBottom: 0 }]}>Player Reviews</Text>
            <View style={styles.reviewBadgeWrap}>
              <Ionicons name="star" size={13} color="#F59E0B" style={{ marginRight: 3 }} />
              <Text style={[styles.reviewBadgeText, { color: C.text }]}>{ratingAvg.toFixed(1)} / 5.0</Text>
            </View>
          </View>

          {reviews.length === 0 ? (
            <View style={[styles.emptyReviewBox, { backgroundColor: C.card, borderColor: C.border }]}>
              <Feather name="message-square" size={24} color={C.caption} style={{ marginBottom: 6 }} />
              <Text style={[styles.emptyReviewText, { color: C.text }]}>
                No written reviews yet
              </Text>
              <Text style={[styles.emptyReviewSub, { color: C.subtext }]}>
                Book your match slot and be the first verified player to review!
              </Text>
            </View>
          ) : (
            reviews.slice(0, 3).map((rv) => (
              <View
                key={rv._id || rv.id}
                style={[styles.reviewCard, { backgroundColor: C.card, borderColor: C.border }]}
              >
                <View style={styles.reviewTop}>
                  <View style={[styles.reviewerAvatar, { backgroundColor: C.primaryLight }]}>
                    <Text style={[styles.avatarLetter, { color: C.primary }]}>
                      {(rv.user?.name || 'P')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.reviewerName, { color: C.text }]}>
                      {rv.user?.name || 'Verified Player'}
                    </Text>
                    <Text style={[styles.reviewDate, { color: C.caption }]}>Verified Match Booking</Text>
                  </View>
                  <RatingBadge rating={rv.rating || 5} size="sm" />
                </View>
                {!!rv.comment && (
                  <Text style={[styles.reviewComment, { color: C.subtext }]}>{rv.comment}</Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Sticky Bottom Action Bar ── */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: dark ? '#0F172A' : '#FFFFFF',
            borderTopColor: C.border,
          },
          SHADOW.floating,
        ]}
      >
        <View style={styles.bottomPriceCol}>
          <Text style={[styles.pricePrefix, { color: C.subtext }]}>Slot Price</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.priceAmount, { color: C.primary }]}>₹{pricePerHour}</Text>
            <Text style={[styles.priceUnit, { color: C.subtext }]}> / hour</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.bookBtn, { backgroundColor: C.primary }]}
          onPress={() => navigation.navigate('SlotPicker', { turf: { ...turf, _id: turf._id || turf.id } })}
          activeOpacity={0.88}
        >
          <Text style={styles.bookBtnText}>Select Slot & Book</Text>
          <Feather name="arrow-right" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>

      {/* ── Fullscreen Interactive Image Viewer Lightbox Modal ── */}
      <Modal
        visible={modalVisible}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <StatusBar barStyle="light-content" backgroundColor="#000000" />

          {/* Modal Header Bar */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => setModalVisible(false)}
              activeOpacity={0.8}
            >
              <Feather name="x" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.modalTitleWrap}>
              <Text style={styles.modalTurfName} numberOfLines={1}>{turf.name}</Text>
              <Text style={styles.modalPhotoCount}>
                Photo {modalIndex + 1} of {images.length}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseBtn}
              onPress={() => shareTurf(turf)}
              activeOpacity={0.8}
            >
              <Feather name="share-2" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Fullscreen Main Image Carousel */}
          <View style={styles.modalCarouselWrap}>
            <FlatList
              ref={modalSliderRef}
              data={images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              snapToInterval={width}
              decelerationRate="fast"
              initialScrollIndex={modalIndex < images.length ? modalIndex : 0}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              onMomentumScrollEnd={(e) => {
                const newIdx = Math.round(e.nativeEvent.contentOffset.x / width);
                setModalIndex(newIdx);
              }}
              keyExtractor={(_, i) => `modal_${i}`}
              renderItem={({ item }) => (
                <View style={styles.modalImageContainer}>
                  <Image
                    source={{ uri: item }}
                    style={styles.modalFullImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            />
          </View>

          {/* Bottom Interactive Thumbnail Strip */}
          <View style={styles.modalThumbnailsWrap}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbScroll}>
              {images.map((img, i) => (
                <TouchableOpacity
                  key={`thumb_${i}`}
                  onPress={() => {
                    modalSliderRef.current?.scrollToIndex({ index: i, animated: true });
                    setModalIndex(i);
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.thumbBox,
                    i === modalIndex && styles.thumbBoxActive,
                  ]}
                >
                  <Image source={{ uri: img }} style={styles.thumbImage} resizeMode="cover" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 130 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 13, fontWeight: '600' },

  heroOuterWrap: {
    width: '100%',
    height: 330,
    backgroundColor: '#0B0F17',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    overflow: 'hidden',
  },
  heroWrap: {
    width: '100%',
    height: 330,
    position: 'relative',
  },
  heroImageTouchable: {
    width: width,
    height: 330,
  },
  heroImage: {
    width: width,
    height: 330,
  },

  floatingTopBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 52 : 46,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  floatingBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  floatingRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  arrowBtn: {
    position: 'absolute',
    top: '46%',
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  arrowLeft: {
    left: 12,
  },
  arrowRight: {
    right: 12,
  },

  bottomHeroOverlay: {
    position: 'absolute',
    bottom: 14,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 5,
  },
  photoCountPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.22)',
  },
  photoCountCurrent: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
  photoCountDivider: {
    color: 'rgba(255, 255, 255, 0.45)',
    fontSize: 11,
    fontWeight: '600',
  },
  photoCountTotal: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 11,
    fontWeight: '700',
  },

  paginationDotsCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#FFFFFF',
  },
  dotInactive: {
    width: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },

  contentWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 18,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  verifiedText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  ratingNum: {
    fontSize: 12,
    fontWeight: '800',
  },
  ratingCount: {
    fontSize: 11,
    marginLeft: 3,
  },
  turfTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.4,
    marginBottom: 16,
  },

  quickInfoGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    marginBottom: 14,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  colDivider: {
    width: 1,
    height: 36,
  },

  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 22,
  },
  mapIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  mapDirectionsText: {
    fontSize: 12,
    fontWeight: '800',
    marginTop: 3,
  },

  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginBottom: 12,
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  sportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  sportChipText: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 8,
  },

  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  amenityCard: {
    width: (width - SPACING.lg * 2 - 10) / 2,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
  },
  amenityIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  amenityText: {
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },

  rulesCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 22,
    gap: 10,
  },
  ruleItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  ruleText: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 18,
    flex: 1,
  },

  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  reviewBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  emptyReviewBox: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyReviewText: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyReviewSub: {
    fontSize: 11,
    marginTop: 3,
    textAlign: 'center',
  },
  reviewCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reviewTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reviewerAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: {
    fontSize: 14,
    fontWeight: '800',
  },
  reviewerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  reviewDate: {
    fontSize: 10,
    marginTop: 1,
  },
  reviewComment: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 8,
    lineHeight: 18,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: Platform.OS === 'ios' ? 34 : 18,
    borderTopWidth: 1,
  },
  bottomPriceCol: {
    flex: 1,
  },
  pricePrefix: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceAmount: {
    fontSize: 22,
    fontWeight: '900',
  },
  priceUnit: {
    fontSize: 12,
    fontWeight: '600',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    height: 52,
    borderRadius: RADIUS.xl,
    minWidth: 190,
  },
  bookBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },

  /* ── Fullscreen Lightbox Modal Styles ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
  },
  modalHeader: {
    paddingTop: Platform.OS === 'ios' ? 56 : 42,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  modalCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  modalTurfName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  modalPhotoCount: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  modalCarouselWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  modalImageContainer: {
    width: width,
    height: height * 0.65,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalFullImage: {
    width: width,
    height: '100%',
  },
  modalThumbnailsWrap: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    paddingTop: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  thumbScroll: {
    paddingHorizontal: 16,
    gap: 10,
    alignItems: 'center',
  },
  thumbBox: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.md,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    opacity: 0.6,
  },
  thumbBoxActive: {
    borderColor: '#10B981',
    opacity: 1,
    transform: [{ scale: 1.08 }],
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});