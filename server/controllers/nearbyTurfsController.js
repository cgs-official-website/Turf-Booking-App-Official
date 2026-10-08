const prisma = require('../config/prisma');
const { query } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Calculate distance between two coordinates using the Haversine formula (km)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined || lat1 === null ||
    lon1 === undefined || lon1 === null ||
    lat2 === undefined || lat2 === null ||
    lon2 === undefined || lon2 === null
  ) {
    return Infinity;
  }

  const R = 6371; // Earth radius in km
  const toRad = (deg) => (Number(deg) * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const rLat1 = toRad(lat1);
  const rLat2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

let columnsChecked = false;

/**
 * Ensure latitude and longitude columns exist and are synced on DB
 */
async function ensureLatLngColumns() {
  if (columnsChecked) return;
  try {
    await query(`
      ALTER TABLE "turfs"
      ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION,
      ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
    `);

    // Sync any existing lat/lng values to latitude/longitude
    await query(`
      UPDATE "turfs"
      SET "latitude" = COALESCE("latitude", "lat", ("location"->>'lat')::DOUBLE PRECISION, ("location"->>'latitude')::DOUBLE PRECISION),
          "longitude" = COALESCE("longitude", "lng", ("location"->>'lng')::DOUBLE PRECISION, ("location"->>'longitude')::DOUBLE PRECISION)
      WHERE "latitude" IS NULL OR "longitude" IS NULL;
    `);
    columnsChecked = true;
  } catch (err) {
    console.warn('⚠️ NearbyTurf: ensureLatLngColumns warning:', err.message);
  }
}

const nearbyTurfsController = {
  /**
   * GET /api/turfs/nearby?lat=..&lng=..&radius=5
   * Fetches turfs within radius (default 5 km), sorted nearest first
   */
  async getNearbyTurfs(req, res) {
    try {
      await ensureLatLngColumns();

      const { lat, lng, radius } = req.query;

      if (lat === undefined || lng === undefined || lat === '' || lng === '') {
        return sendError(res, 'Latitude (lat) and longitude (lng) are required query parameters', 400, 'MISSING_COORDINATES');
      }

      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);

      if (isNaN(userLat) || isNaN(userLng)) {
        return sendError(res, 'Invalid coordinates. lat and lng must be numbers.', 400, 'INVALID_COORDINATES');
      }

      const maxRadiusKm = Math.max(parseFloat(radius) || 5, 0.1);

      // Query active turfs
      const turfs = await prisma.turf.findMany({
        where: {
          status: 'active',
        },
      });

      const DEFAULT_IMAGE =
        'https://images.unsplash.com/photo-1529900245534-5e117b604e5a?auto=format&fit=crop&w=800&q=80';

      const nearbyList = [];

      for (const t of turfs) {
        // Resolve latitude and longitude
        const tLat = t.latitude ?? t.lat ?? (typeof t.location === 'object' && (t.location?.lat ?? t.location?.latitude));
        const tLng = t.longitude ?? t.lng ?? (typeof t.location === 'object' && (t.location?.lng ?? t.location?.longitude));

        if (tLat === undefined || tLat === null || tLng === undefined || tLng === null) {
          continue;
        }

        const distanceKm = calculateDistance(userLat, userLng, tLat, tLng);

        if (distanceKm <= maxRadiusKm) {
          const sports = Array.isArray(t.sports) && t.sports.length > 0
            ? t.sports
            : (Array.isArray(t.sportTypes) && t.sportTypes.length > 0 ? t.sportTypes : ['Football']);

          const primaryType = sports[0] || 'Turf';
          const images = Array.isArray(t.images) && t.images.length > 0 ? t.images : [];
          const mainImage = images[0] || t.logo || DEFAULT_IMAGE;
          const price = Number(t.pricePerHour || 0);

          nearbyList.push({
            id: t.id,
            name: t.name,
            distance: Number(distanceKm.toFixed(1)),
            distanceText: `${distanceKm.toFixed(1)} km`,
            type: primaryType,
            sports,
            price,
            pricePerHour: price,
            image: mainImage,
            images,
            city: t.city || (typeof t.location === 'object' ? t.location?.city : '') || '',
            address: (typeof t.location === 'object' ? t.location?.address : '') || t.city || '',
            ratingAvg: Number(t.reviewsCount === 0 ? 0 : (t.ratingAvg || 0)),
            reviewsCount: Number(t.reviewsCount || 0),
            latitude: tLat,
            longitude: tLng,
          });
        }
      }

      // Sort by Rating DESCENDING (primary), Distance ASCENDING (secondary tie-breaker)
      nearbyList.sort((a, b) => {
        const rA = Number(a.ratingAvg || 0);
        const rB = Number(b.ratingAvg || 0);
        if (rB !== rA) {
          return rB - rA;
        }
        return a.distance - b.distance;
      });

      return sendSuccess(res, {
        turfs: nearbyList,
        count: nearbyList.length,
        radius: maxRadiusKm,
        userLocation: { lat: userLat, lng: userLng },
        message: nearbyList.length === 0 ? `No turfs found within ${maxRadiusKm} km` : undefined,
      });
    } catch (err) {
      console.error('getNearbyTurfs error:', err);
      return sendError(res, 'Failed to fetch nearby turfs', 500, 'NEARBY_FETCH_FAILED');
    }
  },
  ensureLatLngColumns,
};

module.exports = nearbyTurfsController;
