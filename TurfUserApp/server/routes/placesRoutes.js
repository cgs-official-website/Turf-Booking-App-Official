const express = require('express');
const router = express.Router();
const { getAutocomplete } = require('../controllers/placesController');

router.get('/autocomplete', getAutocomplete);

module.exports = router;