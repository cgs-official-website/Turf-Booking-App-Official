const axios = require('axios');
const { sendSuccess, sendError } = require('../utils/response');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

const POPULAR_HUBS = [
  { description: 'Chennai, Tamil Nadu, India', place_id: 'hub_chennai', lat: 13.0827, lng: 80.2707 },
  { description: 'Coimbatore, Tamil Nadu, India', place_id: 'hub_cbe', lat: 11.0168, lng: 76.9558 },
  { description: 'Madurai, Tamil Nadu, India', place_id: 'hub_madurai', lat: 9.9252, lng: 78.1198 },
  { description: 'Tiruchirappalli, Tamil Nadu, India', place_id: 'hub_trichy', lat: 10.7905, lng: 78.7047 },
  { description: 'Salem, Tamil Nadu, India', place_id: 'hub_salem', lat: 11.6643, lng: 78.1460 },
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
        predictions: POPULAR_HUBS.slice(0, 6),
      });
    }

    if (GOOGLE_MAPS_API_KEY) {
      try {
        const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
          input
        )}&components=country:in&key=${GOOGLE_MAPS_API_KEY}`;

        const response = await axios.get(url, { timeout: 3500 });
        if (response.data.status === 'OK' && (response.data.predictions || []).length > 0) {
          return sendSuccess(res, {
            predictions: response.data.predictions,
            status: 'OK',
          });
        }
      } catch (err) {
        console.warn('Google Places live API fallback:', err.message);
      }
    }

    // Match against popular hubs and generate dynamic prediction
    const matches = POPULAR_HUBS.filter((h) =>
      h.description.toLowerCase().includes(query)
    );

    if (matches.length > 0) {
      return sendSuccess(res, { predictions: matches });
    }

    return sendSuccess(res, {
      predictions: [
        { description: `${input.trim()}, Tamil Nadu, India`, place_id: `custom_${Date.now()}` },
        { description: `${input.trim()}, India`, place_id: `custom_in_${Date.now()}` },
      ],
    });
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
