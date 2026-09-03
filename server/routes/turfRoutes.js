const express = require('express');
const router = express.Router();
const turfController = require('../controllers/turfController');
const verifySessionToken = require('../middleware/verifySessionToken');

// Public Turf Discovery Endpoints
router.get('/meta/locations', turfController.getTurfLocations);
router.get('/meta/filters', turfController.getTurfLocations);
router.get('/', turfController.getTurfs);
router.get('/:turfId', turfController.getTurfById);
router.get('/:turfId/slots', turfController.getAvailableSlots);
router.get('/:turfId/reviews', turfController.getTurfReviews);

// Authenticated User Wishlist Toggle
router.post('/:turfId/wishlist', verifySessionToken, turfController.toggleWishlist);

module.exports = router;
