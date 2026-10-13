const prisma = require('../config/prisma');
const { sendSuccess, sendError } = require('../utils/response');

function formatPublicOffer(offer) {
  if (!offer) return null;
  const turf = offer.turf || {};
  const baseRate = Number(turf.pricePerHour || 500);
  const discountType = offer.discountType;
  const discountValue = Number(offer.discountValue);

  let discountedPrice = baseRate;
  let discountLabel = '';
  let saving = 0;

  if (discountType === 'percentage') {
    discountedPrice = Math.max(1, Math.round((baseRate * (100 - discountValue)) / 100));
    discountLabel = `${Math.round(discountValue)}% OFF`;
    saving = Math.round(baseRate - discountedPrice);
  } else {
    discountedPrice = Math.max(1, Math.round(discountValue));
    discountLabel = `₹${discountedPrice}/hr`;
    saving = Math.max(0, Math.round(baseRate - discountedPrice));
  }

  const rawImages = Array.isArray(turf.images) && turf.images.length > 0
    ? turf.images
    : (turf.image ? [turf.image] : []);

  return {
    id: offer.id,
    offerId: offer.id,
    turfId: offer.turfId,
    title: offer.title,
    description: offer.description || '',
    discountType: offer.discountType,
    discountValue,
    discountLabel,
    originalPrice: baseRate,
    discountedPrice,
    saving,
    scope: offer.scope,
    startDate: offer.startDate,
    endDate: offer.endDate,
    applicableSlots: Array.isArray(offer.applicableSlots) ? offer.applicableSlots : [],
    weekdays: Array.isArray(offer.weekdays) ? offer.weekdays : [],
    bannerUrl: offer.bannerUrl || null,
    status: offer.status,
    turf: {
      id: turf.id,
      _id: turf.id,
      name: turf.name || 'Turf Arena',
      city: turf.city || turf.location?.city || '',
      address: turf.address || turf.location?.address || `${turf.city || 'Tamil Nadu'}`,
      pricePerHour: baseRate,
      price: baseRate,
      ratingAvg: Number(turf.ratingAvg || 0),
      reviewsCount: Number(turf.reviewsCount || 0),
      images: rawImages,
      image: rawImages[0] || null,
      sports: Array.isArray(turf.sports) ? turf.sports : (Array.isArray(turf.sportTypes) ? turf.sportTypes : []),
    },
    createdAt: offer.createdAt,
  };
}

const userOfferController = {
  /**
   * GET /api/offers
   * Retrieve all currently active and valid offers for user discovery
   */
  async getAllActiveOffers(req, res) {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const includeUpcoming = req.query.includeUpcoming === 'true';

      const whereClause = {
        status: 'active',
        endDate: { gte: todayStr },
      };

      if (!includeUpcoming) {
        whereClause.startDate = { lte: todayStr };
      }

      if (req.query.city) {
        whereClause.turf = {
          city: { equals: String(req.query.city).trim(), mode: 'insensitive' },
          status: 'active',
        };
      } else {
        whereClause.turf = {
          status: 'active',
        };
      }

      const offers = await prisma.offer.findMany({
        where: whereClause,
        include: {
          turf: {
            select: {
              id: true,
              name: true,
              city: true,
              location: true,
              pricePerHour: true,
              images: true,
              ratingAvg: true,
              reviewsCount: true,
              sports: true,
              status: true,
            },
          },
        },
        orderBy: [
          { discountValue: 'desc' },
          { createdAt: 'desc' },
        ],
      });

      const formatted = offers.map(formatPublicOffer);

      return sendSuccess(res, {
        count: formatted.length,
        offers: formatted,
      });
    } catch (err) {
      console.error('userOfferController.getAllActiveOffers error:', err);
      return sendError(res, 'Failed to fetch offers', 500, 'FETCH_OFFERS_FAILED');
    }
  },

  /**
   * GET /api/turfs/:turfId/offers
   * Retrieve active offers for a specific turf
   */
  async getTurfOffers(req, res) {
    try {
      const { turfId } = req.params;
      const todayStr = new Date().toISOString().slice(0, 10);

      const offers = await prisma.offer.findMany({
        where: {
          turfId,
          status: 'active',
          endDate: { gte: todayStr },
          startDate: { lte: todayStr },
        },
        include: {
          turf: {
            select: {
              id: true,
              name: true,
              pricePerHour: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return sendSuccess(res, {
        turfId,
        offers: offers.map(formatPublicOffer),
      });
    } catch (err) {
      console.error('userOfferController.getTurfOffers error:', err);
      return sendError(res, 'Failed to fetch turf offers', 500, 'FETCH_FAILED');
    }
  },
};

module.exports = userOfferController;
