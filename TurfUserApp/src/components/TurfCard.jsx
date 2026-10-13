import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { useSelector } from 'react-redux';
import { RatingBadge } from './RatingBadge';
import { getImageUrl } from '../api/client';
import { RADIUS, FONT, SHADOW } from '../utils/theme';

const { width } = Dimensions.get('window');
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';

function isValidCoordinate(lat, lng) {
  if (lat == null || lng == null) return false;
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return false;
  if (numLat === 0 && numLng === 0) return false;
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) return false;
  return true;
}

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (!isValidCoordinate(lat1, lon1) || !isValidCoordinate(lat2, lon2)) return null;
  const R = 6371;
  const radLat1 = (Number(lat1) * Math.PI) / 180;
  const radLat2 = (Number(lat2) * Math.PI) / 180;
  const dLatRad = ((Number(lat2) - Number(lat1)) * Math.PI) / 180;
  const dLonRad = ((Number(lon2) - Number(lon1)) * Math.PI) / 180;
  const a =
    Math.sin(dLatRad / 2) * Math.sin(dLatRad / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLonRad / 2) * Math.sin(dLonRad / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

function getDisplayDistance(turf, userCoords) {
  if (!turf) return 'Location unavailable';

  if (typeof turf.distance === 'number' && !isNaN(turf.distance)) {
    return `${turf.distance} km`;
  }

  const uLat = userCoords?.lat ?? userCoords?.latitude;
  const uLng = userCoords?.lng ?? userCoords?.longitude;
  if (!isValidCoordinate(uLat, uLng)) {
    return 'Location unavailable';
  }

  const turfLat = turf.latitude ?? turf.lat ?? turf.location?.latitude ?? turf.location?.lat ?? turf.location?.geo?.lat;
  const turfLng = turf.longitude ?? turf.lng ?? turf.location?.longitude ?? turf.location?.lng ?? turf.location?.geo?.lng;
  if (!isValidCoordinate(turfLat, turfLng)) {
    return 'Location unavailable';
  }

  const dist = calculateDistanceKm(uLat, uLng, turfLat, turfLng);
  if (dist !== null && !isNaN(dist)) {
    return `${dist} km`;
  }
  return 'Location unavailable';
}

function isOfferCurrentlyLive(turf) {
  if (!turf) return false;
  const offer = turf.activeOffer;
  if (!offer && !turf.hasOffer) return false;

  if (offer) {
    if (offer.status && offer.status !== 'active') return false;

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;

    const startStr = String(offer.startDate || '').slice(0, 10);
    const endStr = String(offer.endDate || offer.startDate || '').slice(0, 10);

    if (startStr && todayStr < startStr) return false;
    if (endStr && todayStr > endStr) return false;

    if (offer.scope === 'weekdays' && Array.isArray(offer.weekdays) && offer.weekdays.length > 0) {
      const dayNum = now.getDay();
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const todayName = dayNames[dayNum];
      const match = offer.weekdays.some((w) => {
        if (typeof w === 'number') return w === dayNum;
        const str = String(w).trim().toLowerCase();
        return str === todayName || str === String(dayNum);
      });
      if (!match) return false;
    }
    return true;
  }

  return Boolean(turf.hasOffer);
}

export default function TurfCard({
  turf,
  onPress,
  isFavorite = false,
  onToggleFavorite,
  variant = 'vertical',
  style,
  userCoords: propUserCoords,
}) {
  const { C, dark } = useTheme();
  const storeUserCoords = useSelector((s) => s.auth.userCoords);
  const userCoords = propUserCoords || storeUserCoords;

  if (!turf) return null;

  const turfId = turf.id || turf._id;
  const name = turf.name || 'Turf Arena';
  const rawImage = turf.logo || turf.images?.[0] || turf.image || turf.photo;
  const imageUri = rawImage ? getImageUrl(rawImage) : PLACEHOLDER_IMG;
  const price = turf.pricePerHour || turf.pricing?.baseRate || turf.price || 800;
  const locationText = turf.location?.city || turf.location?.address || turf.address || 'Local Venue';
  const rating = turf.rating?.avg ?? turf.ratingAvg ?? (typeof turf.rating === 'number' ? turf.rating : 0);
  const count = turf.rating?.count ?? turf.reviewsCount ?? 0;
  const sports = turf.sportTypes || turf.sports || [];
  const distance = getDisplayDistance(turf, userCoords);

  const isValidOffer = isOfferCurrentlyLive(turf);
  const hasOffer = isValidOffer;
  const activeOffer = isValidOffer ? (turf.activeOffer || null) : null;
  const offerPrice = isValidOffer && turf.offerPrice ? Number(turf.offerPrice) : (isValidOffer && activeOffer?.offerPrice ? Number(activeOffer.offerPrice) : null);
  const offerBadgeText = turf.offerDiscount || activeOffer?.discountLabel || 'OFFER';

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[
          styles.featuredCard,
          {
            backgroundColor: dark ? '#131E2F' : '#FFFFFF',
            borderColor: hasOffer ? (dark ? '#E11D48' : '#FDA4AF') : (dark ? '#223249' : '#E2E8F0'),
            borderWidth: hasOffer ? 1.5 : 1,
          },
          SHADOW.card,
          style,
        ]}
      >
        <View style={styles.featuredImageWrap}>
          <Image source={{ uri: imageUri }} style={styles.featuredImage} resizeMode="cover" />
          <View style={styles.imageOverlay} />

          {/* Top floating badges */}
          <View style={styles.topFloatingRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.verifiedBadge}>
                <Feather name="check-circle" size={12} color="#0F766E" style={{ marginRight: 4 }} />
                <Text style={styles.verifiedText}>Verified Pitch</Text>
              </View>

              {hasOffer && (
                <View style={styles.offerBadgeFloating}>
                  <Feather name="tag" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
                  <Text style={styles.offerBadgeFloatingText}>{offerBadgeText}</Text>
                </View>
              )}
            </View>

            {onToggleFavorite && (
              <TouchableOpacity
                style={styles.favoriteBtn}
                onPress={() => onToggleFavorite(turfId)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isFavorite ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavorite ? '#EF4444' : '#FFFFFF'}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Bottom image stats */}
          <View style={styles.bottomFloatingRow}>
            <RatingBadge rating={rating} count={count} />
            <View style={styles.distancePill}>
              <Feather name="navigation" size={11} color="#FFFFFF" style={{ marginRight: 3 }} />
              <Text style={styles.distanceText}>{distance}</Text>
            </View>
          </View>
        </View>

        <View style={styles.featuredBody}>
          <Text style={[styles.turfName, { color: C.text }]} numberOfLines={1}>
            {name}
          </Text>

          <View style={styles.locationRow}>
            <Feather name="map-pin" size={13} color={C.subtext} style={{ marginRight: 4 }} />
            <Text style={[styles.locationText, { color: C.subtext }]} numberOfLines={1}>
              {locationText}
            </Text>
          </View>

          {/* Sports tag & price footer */}
          <View style={styles.footerRow}>
            <View style={styles.sportsRow}>
              {sports.slice(0, 2).map((s, idx) => (
                <View key={idx} style={[styles.sportTag, { backgroundColor: C.bgSoft }]}>
                  <Text style={[styles.sportTagText, { color: C.subtext }]}>{s}</Text>
                </View>
              ))}
            </View>

            <View style={styles.priceRow}>
              {hasOffer && offerPrice && offerPrice < price ? (
                <Text style={[styles.originalPriceStrikethrough, { color: C.subtext }]}>₹{price}</Text>
              ) : null}
              <Text style={[styles.priceNumber, { color: (hasOffer && offerPrice && offerPrice < price) ? '#E11D48' : C.primary }]}>
                ₹{hasOffer && offerPrice && offerPrice < price ? offerPrice : price}
              </Text>
              <Text style={[styles.priceUnit, { color: C.subtext }]}>/hr</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.verticalCard,
        {
          backgroundColor: dark ? '#131E2F' : '#FFFFFF',
          borderColor: hasOffer ? (dark ? 'rgba(225,29,72,0.6)' : '#FDA4AF') : (dark ? '#223249' : '#E2E8F0'),
          borderWidth: hasOffer ? 1.5 : 1,
        },
        SHADOW.subtle,
        style,
      ]}
    >
      <View style={styles.verticalImageWrap}>
        <Image source={{ uri: imageUri }} style={styles.verticalImage} resizeMode="cover" />

        {hasOffer && (
          <View style={styles.offerBadgeVertical}>
            <Feather name="tag" size={10} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.offerBadgeVerticalText}>{offerBadgeText}</Text>
          </View>
        )}

        {onToggleFavorite && (
          <TouchableOpacity
            style={styles.favoriteBtnSmall}
            onPress={() => onToggleFavorite(turfId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isFavorite ? 'heart' : 'heart-outline'}
              size={17}
              color={isFavorite ? '#EF4444' : '#FFFFFF'}
            />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.verticalBody}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.verticalTitle, { color: C.text }]} numberOfLines={1}>
            {name}
          </Text>
          <RatingBadge rating={rating} count={count} size="sm" />
        </View>

        <View style={styles.locationRow}>
          <Feather name="map-pin" size={12} color={C.subtext} style={{ marginRight: 4 }} />
          <Text style={[styles.locationText, { color: C.subtext }]} numberOfLines={1}>
            {locationText} • {distance}
          </Text>
        </View>

        <View style={styles.verticalFooter}>
          <View style={styles.sportsRow}>
            {(sports.length > 0 ? sports.slice(0, 2) : ['General']).map((s, idx) => (
              <View key={idx} style={[styles.sportTagSmall, { backgroundColor: C.bgSoft }]}>
                <Text style={[styles.sportTagTextSmall, { color: C.subtext }]}>{s}</Text>
              </View>
            ))}
          </View>

          <View style={styles.priceRow}>
            {hasOffer && offerPrice && offerPrice < price ? (
              <Text style={[styles.originalPriceStrikethroughSmall, { color: C.subtext }]}>₹{price}</Text>
            ) : null}
            <Text style={[styles.priceNumberSmall, { color: (hasOffer && offerPrice && offerPrice < price) ? '#E11D48' : C.primary }]}>
              ₹{hasOffer && offerPrice && offerPrice < price ? offerPrice : price}
            </Text>
            <Text style={[styles.priceUnit, { color: C.subtext }]}>/hr</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Featured Horizontal Card
  featuredCard: {
    width: width * 0.78,
    borderRadius: RADIUS.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    marginRight: 14,
    marginBottom: 8,
  },
  featuredImageWrap: {
    width: '100%',
    height: 155,
    position: 'relative',
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.25)',
  },
  topFloatingRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.round,
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  favoriteBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomFloatingRow: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  distancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.round,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  featuredBody: {
    padding: 14,
  },
  turfName: {
    ...FONT.h3,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  sportsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  sportTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  sportTagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  priceNumber: {
    fontSize: 18,
    fontWeight: '900',
  },
  priceUnit: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
  },

  // Vertical Card
  verticalCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  verticalImageWrap: {
    width: '100%',
    height: 130,
    position: 'relative',
  },
  verticalImage: {
    width: '100%',
    height: '100%',
  },
  favoriteBtnSmall: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalBody: {
    padding: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  verticalTitle: {
    ...FONT.h3,
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
    marginRight: 8,
  },
  verticalFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sportTagSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
  },
  sportTagTextSmall: {
    fontSize: 10,
    fontWeight: '600',
  },
  priceNumberSmall: {
    fontSize: 16,
    fontWeight: '800',
  },
});
