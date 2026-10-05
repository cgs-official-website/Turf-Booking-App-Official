const axios = require('axios');
const { sendSuccess, sendError } = require('../utils/response');
const cacheService = require('../services/cacheService');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

const POPULAR_HUBS = [
  // Major Tamil Nadu Hubs & Chennai Areas
  { description: 'Chennai, Tamil Nadu, India', place_id: 'hub_chennai', lat: 13.0827, lng: 80.2707 },
  { description: 'Anna Nagar, Chennai, Tamil Nadu, India', place_id: 'hub_anna_nagar', lat: 13.0850, lng: 80.2101 },
  { description: 'T. Nagar, Chennai, Tamil Nadu, India', place_id: 'hub_tnagar', lat: 13.0418, lng: 80.2341 },
  { description: 'Velachery, Chennai, Tamil Nadu, India', place_id: 'hub_velachery', lat: 12.9815, lng: 80.2180 },
  { description: 'Adyar, Chennai, Tamil Nadu, India', place_id: 'hub_adyar', lat: 13.0012, lng: 80.2565 },
  { description: 'OMR, Chennai, Tamil Nadu, India', place_id: 'hub_omr', lat: 12.9150, lng: 80.2290 },
  { description: 'Guindy, Chennai, Tamil Nadu, India', place_id: 'hub_guindy', lat: 13.0067, lng: 80.2025 },
  { description: 'Tambaram, Chennai, Tamil Nadu, India', place_id: 'hub_tambaram', lat: 12.9249, lng: 80.1000 },
  { description: 'Porur, Chennai, Tamil Nadu, India', place_id: 'hub_porur', lat: 13.0382, lng: 80.1565 },
  { description: 'Nungambakkam, Chennai, Tamil Nadu, India', place_id: 'hub_nungambakkam', lat: 13.0604, lng: 80.2404 },
  { description: 'Coimbatore, Tamil Nadu, India', place_id: 'hub_cbe', lat: 11.0168, lng: 76.9558 },
  { description: 'Madurai, Tamil Nadu, India', place_id: 'hub_madurai', lat: 9.9252, lng: 78.1198 },
  { description: 'Tiruchirappalli, Tamil Nadu, India', place_id: 'hub_trichy', lat: 10.7905, lng: 78.7047 },
  { description: 'Salem, Tamil Nadu, India', place_id: 'hub_salem', lat: 11.6643, lng: 78.1460 },
  { description: 'Tirunelveli, Tamil Nadu, India', place_id: 'hub_tirunelveli', lat: 8.7139, lng: 77.7567 },
  { description: 'Erode, Tamil Nadu, India', place_id: 'hub_erode', lat: 11.3410, lng: 77.7172 },
  { description: 'Tiruppur, Tamil Nadu, India', place_id: 'hub_tiruppur', lat: 11.1085, lng: 77.3411 },
  { description: 'Vellore, Tamil Nadu, India', place_id: 'hub_vellore', lat: 12.9165, lng: 79.1325 },
  { description: 'Thanjavur, Tamil Nadu, India', place_id: 'hub_thanjavur', lat: 10.7870, lng: 79.1378 },
  { description: 'Dindigul, Tamil Nadu, India', place_id: 'hub_dindigul', lat: 10.3673, lng: 77.9803 },
  { description: 'Hosur, Tamil Nadu, India', place_id: 'hub_hosur', lat: 12.7409, lng: 77.8253 },
  { description: 'Nagercoil, Tamil Nadu, India', place_id: 'hub_nagercoil', lat: 8.1833, lng: 77.4119 },
  { description: 'Bengaluru, Karnataka, India', place_id: 'hub_blr', lat: 12.9716, lng: 77.5946 },
  { description: 'Hyderabad, Telangana, India', place_id: 'hub_hyd', lat: 17.3850, lng: 78.4867 },
  { description: 'Kochi, Kerala, India', place_id: 'hub_kochi', lat: 9.9312, lng: 76.2673 },
  { description: 'Mumbai, Maharashtra, India', place_id: 'hub_mum', lat: 19.0760, lng: 72.8777 },
];

const placesController = {
  /**
   * GET /api/v1/places/autocomplete
   * Search places/cities via Google Places API proxy with instant fallback
   */
  async autocomplete(req, res) {
    const { input = '' } = req.query;
    const query = input.trim().toLowerCase();

    if (!query || query.length < 1) {
      return sendSuccess(res, {
        predictions: POPULAR_HUBS.slice(0, 8),
      });
    }

    const cacheKey = `places_autocomplete_${query}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    // Fast local hub match
    const localMatches = POPULAR_HUBS.filter((h) =>
      h.description.toLowerCase().includes(query)
    );

    if (GOOGLE_MAPS_API_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`;

        // Fast 1.2s timeout so requests never lag
        const response = await axios.get(url, { timeout: 1200 });
        if (response.data.status === 'OK' && (response.data.predictions || []).length > 0) {
          const result = {
            predictions: response.data.predictions,
            status: 'OK',
          };
          await cacheService.set(cacheKey, result, 3600); // 1 hour cache
          return sendSuccess(res, result);
        }
      } catch (err) {
        // Fallback to instant local results
      }
    }

    if (localMatches.length > 0) {
      const result = { predictions: localMatches };
      await cacheService.set(cacheKey, result, 3600);
      return sendSuccess(res, result);
    }

    const fallbackResult = {
      predictions: [
        { description: `${input.trim()}, Tamil Nadu, India`, place_id: `custom_${Date.now()}` },
        { description: `${input.trim()}, India`, place_id: `custom_in_${Date.now()}` },
      ],
    };
    await cacheService.set(cacheKey, fallbackResult, 1800);
    return sendSuccess(res, fallbackResult);
  },

  /**
   * GET /api/v1/places/details
   * Fetch place lat/lng coordinates
   */
  async placeDetails(req, res) {
    const { placeId } = req.query;

    if (!placeId) {
      return sendError(res, 'placeId is required', 400, 'MISSING_PLACE_ID');
    }

    const hub = POPULAR_HUBS.find((h) => h.place_id === placeId);
    if (hub) {
      return sendSuccess(res, {
        result: {
          geometry: { location: { lat: hub.lat, lng: hub.lng } },
          formatted_address: hub.description,
        },
      });
    }

    if (GOOGLE_MAPS_API_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(
          placeId
        )}&fields=geometry,formatted_address,name&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await axios.get(url, { timeout: 3500 });
        if (response.data.status === 'OK' && response.data.result) {
          return sendSuccess(res, {
            result: response.data.result,
            status: 'OK',
          });
        }
      } catch (err) {
        console.warn('Google Places details fallback:', err.message);
      }
    }

    return sendSuccess(res, {
      result: {
        geometry: { location: { lat: 13.0827, lng: 80.2707 } },
        formatted_address: 'Chennai, Tamil Nadu, India',
      },
    });
  },
};

module.exports = placesController;
