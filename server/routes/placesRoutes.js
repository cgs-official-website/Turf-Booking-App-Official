const express = require('express');
const router = express.Router();
const placesController = require('../controllers/placesController');

router.get('/autocomplete', placesController.autocomplete);
router.get('/details', placesController.placeDetails);

module.exports = router;
