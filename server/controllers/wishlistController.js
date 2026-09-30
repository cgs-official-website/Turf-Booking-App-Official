const prisma = require('../config/prisma');
const { sendSuccess, sendError } = require('../utils/response');
const { formatTurf } = require('./turfController');

const wishlistController = {
  /**
   * GET /api/v1/wishlist
   * Fetch complete array of wishlisted turf objects for the authenticated user
   */
  async getWishlist(req, res) {
    const { uid } = req.user;

    try {
      const items = await prisma.wishlistItem.findMany({
        where: { userId: uid },
        include: { turf: true },
        orderBy: { createdAt: 'desc' },
      });

      const validTurfs = items
        .filter((item) => item.turf)
        .map((item) => formatTurf(item.turf));

      return sendSuccess(res, {
        wishlist: validTurfs,
        count: validTurfs.length,
      });
    } catch (err) {
      console.error('getWishlist error:', err);
      return sendError(res, 'Failed to fetch wishlist', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/wishlist/:turfId
   * Add a turf to user's saved wishlist
   */
  async addToWishlist(req, res) {
    const { turfId } = req.params;
    const { uid } = req.user;

    try {
      // Check turf exists
      const turf = await prisma.turf.findUnique({ where: { id: turfId } });
      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'TURF_NOT_FOUND');
      }

      await prisma.wishlistItem.upsert({
        where: {
          userId_turfId: { userId: uid, turfId },
        },
        create: {
          userId: uid,
          turfId,
        },
        update: {},
      });

      const allItems = await prisma.wishlistItem.findMany({
        where: { userId: uid },
        select: { turfId: true },
      });

      const wishlistIds = allItems.map((i) => i.turfId);

      return sendSuccess(res, {
        added: true,
        turfId,
        wishlist: wishlistIds,
      });
    } catch (err) {
      console.error('addToWishlist error:', err);
      return sendError(res, 'Failed to add to wishlist', 500, 'ADD_FAILED');
    }
  },

  /**
   * DELETE /api/v1/wishlist/:turfId
   * Remove a turf from user's saved wishlist
   */
  async removeFromWishlist(req, res) {
    const { turfId } = req.params;
    const { uid } = req.user;

    try {
      await prisma.wishlistItem.deleteMany({
        where: {
          userId: uid,
          turfId,
        },
      });

      const allItems = await prisma.wishlistItem.findMany({
        where: { userId: uid },
        select: { turfId: true },
      });

      const wishlistIds = allItems.map((i) => i.turfId);

      return sendSuccess(res, {
        added: false,
        turfId,
        wishlist: wishlistIds,
      });
    } catch (err) {
      console.error('removeFromWishlist error:', err);
      return sendError(res, 'Failed to remove from wishlist', 500, 'REMOVE_FAILED');
    }
  },
};

module.exports = wishlistController;
