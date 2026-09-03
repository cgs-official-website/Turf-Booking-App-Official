const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const verifySessionToken = require('../middleware/verifySessionToken');

router.use(verifySessionToken);

router.get('/', wishlistController.getWishlist);
router.post('/:turfId', wishlistController.addToWishlist);
router.delete('/:turfId', wishlistController.removeFromWishlist);

module.exports = router;
