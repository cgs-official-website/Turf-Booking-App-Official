const express = require('express');
const router = express.Router();

// ⚠️ CHECK THIS: assuming middleware/auth.js exports `protect`.
// If your export name is different (e.g. `authMiddleware`, `verifyUser`),
// just rename the import + usage below to match.
const { protect } = require('../middleware/auth');

const { createReview, getMyReviewedBookings } = require('../controllers/reviewController');

router.post('/', protect, createReview);
router.get('/mine', protect, getMyReviewedBookings);

module.exports = router;