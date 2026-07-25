const express = require('express');
const router = express.Router();
const {
  getTurfs,
  getTurf,
  getAvailability,
  getTurfReviews,
  createTurf,
  getFilterMeta,
} = require('../controllers/turfController');
const { protect, authorize } = require('../middleware/auth');

router.get('/meta/filters', getFilterMeta);
router.get('/', getTurfs);
router.post('/', protect, authorize('vendor', 'admin'), createTurf);
router.get('/:id', getTurf);
router.get('/:id/availability', getAvailability);
router.get('/:id/reviews', getTurfReviews);

module.exports = router;