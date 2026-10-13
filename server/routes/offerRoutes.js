const express = require('express');
const router = express.Router();
const userOfferController = require('../controllers/userOfferController');

// Public User Offer Discovery
router.get('/', userOfferController.getAllActiveOffers);

module.exports = router;
