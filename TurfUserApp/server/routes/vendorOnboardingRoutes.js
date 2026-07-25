const express = require('express');
const router = express.Router();
const { getOnboardingStatus } = require('../controllers/vendorTurfController');
const vendorAuth = require('../middleware/vendorAuth');

// GET /api/vendor/onboarding/status
router.get('/onboarding/status', vendorAuth, getOnboardingStatus);

module.exports = router;