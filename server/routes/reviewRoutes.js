const express = require('express');
const router = express.Router();
const prisma = require('../config/prisma');
const verifySessionToken = require('../middleware/verifySessionToken');
const bookingController = require('../controllers/bookingController');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/v1/reviews - Submit review for a turf/booking
router.post('/', verifySessionToken, bookingController.addReview);

// GET /api/v1/reviews/mine - Get booking IDs reviewed by current user
router.get('/mine', verifySessionToken, async (req, res) => {
  try {
    const { uid } = req.user;
    const reviews = await prisma.review.findMany({
      where: { userId: String(uid) },
      select: { bookingId: true },
    });
    const bookingIds = reviews.map((r) => r.bookingId).filter(Boolean);
    return sendSuccess(res, { bookingIds });
  } catch (err) {
    return sendSuccess(res, { bookingIds: [] });
  }
});

// GET /api/v1/reviews - Public list of active reviews from database
router.get('/', async (req, res) => {
  try {
    const { turfId, limit = 20 } = req.query;
    const take = Math.min(Number(limit) || 20, 50);
    const where = { hidden: false };
    if (turfId) where.turfId = turfId;

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      _id: r.id,
      bookingId: r.bookingId,
      turfId: r.turfId,
      userId: r.userId,
      userName: r.userName,
      userPhoto: r.userPhoto,
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      user: {
        name: r.userName,
        avatar: r.userPhoto,
      },
    }));

    return sendSuccess(res, { reviews: formatted });
  } catch (err) {
    console.warn('GET /reviews error:', err.message);
    return sendSuccess(res, { reviews: [] });
  }
});

module.exports = router;
