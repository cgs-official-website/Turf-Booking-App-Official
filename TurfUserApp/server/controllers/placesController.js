const asyncHandler = require('express-async-handler');

// ── Google Places key lives ONLY here on the server (.env), never shipped
// to the mobile app. Mobile calls OUR /api/places/autocomplete instead of
// Google directly, so the key never appears in the APK/IPA bundle. ──
const GOOGLE_PLACES_API_KEY = process.env.GOOGLE_PLACES_API_KEY;
const AUTOCOMPLETE_URL = 'https://maps.googleapis.com/maps/api/place/autocomplete/json';

// @desc    Proxy Google Places Autocomplete (India, region-level results)
// @route   GET /api/places/autocomplete?input=anna+nagar
// @access  Public
const getAutocomplete = asyncHandler(async (req, res) => {
  const { input } = req.query;

  if (!input || input.trim().length < 2) {
    return res.json({ success: true, predictions: [] });
  }

  if (!GOOGLE_PLACES_API_KEY) {
    res.status(500);
    throw new Error('GOOGLE_PLACES_API_KEY is not set in the server .env');
  }

  const url = `${AUTOCOMPLETE_URL}?input=${encodeURIComponent(input)}&components=country:in&types=(regions)&key=${GOOGLE_PLACES_API_KEY}`;
  const googleRes = await fetch(url);
  const data = await googleRes.json();

  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
    // REQUEST_DENIED / INVALID_REQUEST usually means the key/billing isn't
    // set up correctly on Google Cloud Console.
    res.status(502);
    throw new Error(`Google Places error: ${data.status} ${data.error_message || ''}`);
  }

  res.json({ success: true, predictions: data.predictions || [] });
});

module.exports = { getAutocomplete };