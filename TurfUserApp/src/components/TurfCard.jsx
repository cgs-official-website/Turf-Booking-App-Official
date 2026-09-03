import React from 'react';
import {
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions
} from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useTheme from '../hooks/useTheme';
import { RatingBadge } from './RatingBadge';
import { getImageUrl } from '../api/client';
import { RADIUS, FONT, SHADOW } from '../utils/theme';

const { width } = Dimensions.get('window');
const PLACEHOLDER_IMG = 'https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800';

export default function TurfCard({
  turf,
  onPress,
  isFavorite = false,
  onToggleFavorite,
  variant = 'vertical', // 'featured' | 'vertical' | 'horizontal'
  style,
}) {
  const { C, dark } = useTheme();

  if (!turf) return null;

  const turfId = turf.id || turf._id;
  const name = turf.name || 'Turf Arena';
  const rawImage = turf.images?.[0] || turf.image || turf.photo;
  const imageUri = rawImage ? getImageUrl(rawImage) : PLACEHOLDER_IMG;
  const price = turf.pricePerHour || turf.pricing?.baseRate || turf.price || 800;
  const locationText = turf.location?.city || turf.location?.address || turf.address || 'Local Venue';
  const rating = turf.rating?.avg || turf.rating || 4.8;
  const sports = turf.sportTypes || turf.sports || [];
  const distance = turf.distance !== undefined ? `${turf.distance} km` : '2.4 km';

  if (variant === 'featured') {
    return (
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={onPress}
        style={[
          styles.featuredCard,
          {
            backgroundColor: dark ? '#131E2F' : '#FFFFFF',
            borderColor: dark ? '#223249' : '#E2E8F0',
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
            <View style={styles.verifiedBadge}>
              <Feather name="check-circle" size={12} color="#10B981" style={{ marginRight: 4 }} />
              <Text style={styles.verifiedText}>Verified Pitch</Text>
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
            <RatingBadge rating={rating} />
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
              <Text style={[styles.priceNumber, { color: C.primary }]}>₹{price}</Text>
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
          borderColor: dark ? '#223249' : '#E2E8F0',
        },
        SHADOW.subtle,
        style,
      ]}
    >
      <View style={styles.verticalImageWrap}>
        <Image source={{ uri: imageUri }} style={styles.verticalImage} resizeMode="cover" />
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
          <RatingBadge rating={rating} size="sm" />
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
            <Text style={[styles.priceNumberSmall, { color: C.primary }]}>₹{price}</Text>
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
