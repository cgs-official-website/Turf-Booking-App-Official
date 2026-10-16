const prisma = require('../config/prisma');
const storageService = require('../services/storageService');
const cacheService = require('../services/cacheService');
const { sendSuccess, sendError } = require('../utils/response');

/**
 * Format local date as YYYY-MM-DD avoiding UTC timezone shifts
 */
function getLocalDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Helper to compute real-time dynamic status:
 * - 'paused': vendor manually paused it
 * - 'expired': current date is past endDate
 * - 'scheduled': current date is before startDate
 * - 'active': currently live and valid
 */
function computeDynamicStatus(offer) {
  if (offer.status === 'paused') return 'paused';
  const todayStr = getLocalDateStr();
  const startStr = String(offer.startDate).slice(0, 10);
  const endStr = String(offer.endDate).slice(0, 10);

  if (todayStr > endStr) return 'expired';
  if (todayStr < startStr) return 'scheduled';
  return 'active';
}

function formatOffer(offer) {
  if (!offer) return null;
  return {
    id: offer.id,
    turfId: offer.turfId,
    vendorId: offer.vendorId,
    title: offer.title,
    description: offer.description || '',
    discountType: offer.discountType,
    discountValue: Number(offer.discountValue),
    scope: offer.scope,
    startDate: offer.startDate,
    endDate: offer.endDate,
    applicableSlots: Array.isArray(offer.applicableSlots) ? offer.applicableSlots : [],
    weekdays: Array.isArray(offer.weekdays) ? offer.weekdays : [],
    bannerUrl: offer.bannerUrl || null,
    status: offer.status,
    dynamicStatus: computeDynamicStatus(offer),
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

const vendorOfferController = {
  /**
   * POST /api/vendor/turfs/:turfId/offers
   * Create a new discount offer
   */
  async createOffer(req, res) {
    try {
      const vendorId = req.user.id || req.user.uid;
      const { turfId } = req.params;
      const data = req.body || {};

      // 1. Verify turf ownership
      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
        select: { id: true, vendorId: true, pricePerHour: true, name: true },
      });

      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      if (turf.vendorId !== vendorId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied: Turf does not belong to vendor', 403, 'FORBIDDEN');
      }

      // 2. Validate title
      const title = (data.title || '').trim();
      if (!title || title.length < 3) {
        return sendError(res, 'Offer title is required and must be at least 3 characters', 400, 'INVALID_TITLE');
      }

      // 3. Validate discount type and value
      const discountType = (data.discountType || 'percentage').toLowerCase();
      if (!['percentage', 'fixed'].includes(discountType)) {
        return sendError(res, 'Discount type must be either "percentage" or "fixed"', 400, 'INVALID_DISCOUNT_TYPE');
      }

      const discountValue = Number(data.discountValue);
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        return sendError(res, 'Discount value must be a number greater than 0', 400, 'INVALID_DISCOUNT_VALUE');
      }

      const regularHourlyRate = Number(turf.pricePerHour || 500);

      if (discountType === 'percentage') {
        if (discountValue < 1 || discountValue > 99) {
          return sendError(res, 'Percentage discount must be between 1% and 99%', 400, 'INVALID_PERCENTAGE');
        }
      } else if (discountType === 'fixed') {
        if (discountValue >= regularHourlyRate) {
          return sendError(
            res,
            `Fixed offer price (₹${discountValue}) must be less than regular hourly price (₹${regularHourlyRate})`,
            400,
            'INVALID_FIXED_PRICE'
          );
        }
      }

      // 4. Validate scope & dates
      const scope = (data.scope || 'slot').toLowerCase();
      if (!['slot', 'day', 'weekdays', 'date_range'].includes(scope)) {
        return sendError(res, 'Scope must be "slot", "day", "weekdays", or "date_range"', 400, 'INVALID_SCOPE');
      }

      const startDate = (data.startDate || '').slice(0, 10);
      let endDate = (data.endDate || data.startDate || '').slice(0, 10);
      if (scope === 'day' || scope === 'slot') {
        endDate = startDate;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        return sendError(res, 'Valid start date and end date (YYYY-MM-DD) are required', 400, 'INVALID_DATES');
      }

      if (scope !== 'day' && scope !== 'slot' && startDate > endDate) {
        return sendError(res, 'Start date cannot be after end date', 400, 'INVALID_DATE_RANGE');
      }

      // 5. Parse slots / weekdays based on scope
      let applicableSlots = [];
      if (scope === 'slot') {
        if (typeof data.applicableSlots === 'string') {
          try {
            applicableSlots = JSON.parse(data.applicableSlots);
          } catch (e) {
            applicableSlots = data.applicableSlots.split(',').map((s) => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(data.applicableSlots)) {
          applicableSlots = data.applicableSlots;
        }

        if (!applicableSlots || applicableSlots.length === 0) {
          return sendError(res, 'Please select at least one applicable time slot for slot-specific offers', 400, 'EMPTY_SLOTS');
        }
      }

      let weekdays = [];
      if (scope === 'weekdays') {
        if (typeof data.weekdays === 'string') {
          try {
            weekdays = JSON.parse(data.weekdays);
          } catch (e) {
            weekdays = data.weekdays.split(',').map((s) => s.trim()).filter(Boolean);
          }
        } else if (Array.isArray(data.weekdays)) {
          weekdays = data.weekdays;
        }

        if (!weekdays || weekdays.length === 0) {
          return sendError(res, 'Please select at least one weekday for weekdays-scoped offer', 400, 'EMPTY_WEEKDAYS');
        }
      }

      // 6. Handle Banner Image Upload (if file provided)
      let bannerUrl = (data.bannerUrl || '').trim() || null;
      if (req.file) {
        try {
          const uploadRes = await storageService.uploadFile(req.file, 'offers');
          bannerUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn('⚠️ Offer banner upload failed:', uploadErr.message);
        }
      }

      // 7. Check for conflicting active offers on exact same scope/slots
      const existingOffers = await prisma.offer.findMany({
        where: {
          turfId,
          status: 'active',
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      });

      if (scope === 'slot' && applicableSlots.length > 0) {
        const conflict = existingOffers.find((eo) => {
          if (eo.scope === 'day' || eo.scope === 'date_range') return true;
          if (eo.scope === 'slot' && Array.isArray(eo.applicableSlots)) {
            return eo.applicableSlots.some((s) => applicableSlots.includes(s));
          }
          return false;
        });

        if (conflict) {
          return sendError(
            res,
            `Another active offer "${conflict.title}" already covers one or more of these slots during this date range. Please adjust dates or pause the conflicting offer.`,
            409,
            'OFFER_CONFLICT'
          );
        }
      }

      // 8. Create Offer in database
      const created = await prisma.offer.create({
        data: {
          turfId,
          vendorId,
          title,
          description: (data.description || '').trim() || null,
          discountType,
          discountValue,
          scope,
          startDate,
          endDate,
          applicableSlots,
          weekdays,
          bannerUrl,
          status: 'active',
        },
      });

      // Invalidate turf and slot caches so user app sees the new offer immediately
      try {
        await cacheService.del(`turf:${turfId}`);
        await cacheService.invalidatePattern('turf*');
        await cacheService.invalidateSlots(turfId);
      } catch (cacheErr) {
        console.warn('Cache invalidation warning on createOffer:', cacheErr.message);
      }

      return sendSuccess(res, {
        message: 'Offer created successfully',
        offer: formatOffer(created),
      }, 201);
    } catch (err) {
      console.error('vendorOfferController.createOffer error:', err);
      return sendError(res, 'Failed to create offer', 500, 'CREATE_OFFER_FAILED');
    }
  },

  /**
   * GET /api/vendor/turfs/:turfId/offers
   * List all offers for a turf
   */
  async getOffers(req, res) {
    try {
      const vendorId = req.user.id || req.user.uid;
      const { turfId } = req.params;

      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
        select: { id: true, vendorId: true, pricePerHour: true },
      });

      if (!turf) {
        return sendError(res, 'Turf not found', 404, 'NOT_FOUND');
      }

      if (turf.vendorId !== vendorId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied: Turf does not belong to vendor', 403, 'FORBIDDEN');
      }

      const offers = await prisma.offer.findMany({
        where: { turfId },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = offers.map(formatOffer);

      const summary = {
        total: formatted.length,
        active: formatted.filter((o) => o.dynamicStatus === 'active').length,
        scheduled: formatted.filter((o) => o.dynamicStatus === 'scheduled').length,
        paused: formatted.filter((o) => o.dynamicStatus === 'paused').length,
        expired: formatted.filter((o) => o.dynamicStatus === 'expired').length,
      };

      return sendSuccess(res, {
        turfId,
        offers: formatted,
        summary,
        regularHourlyPrice: Number(turf.pricePerHour || 500),
      });
    } catch (err) {
      console.error('vendorOfferController.getOffers error:', err);
      return sendError(res, 'Failed to fetch offers', 500, 'FETCH_OFFERS_FAILED');
    }
  },

  /**
   * PUT /api/vendor/turfs/:turfId/offers/:offerId
   * Update an existing offer
   */
  async updateOffer(req, res) {
    try {
      const vendorId = req.user.id || req.user.uid;
      const { turfId, offerId } = req.params;
      const data = req.body || {};

      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
        include: { turf: { select: { id: true, vendorId: true, pricePerHour: true } } },
      });

      if (!offer || offer.turfId !== turfId) {
        return sendError(res, 'Offer not found', 404, 'NOT_FOUND');
      }

      if (offer.vendorId !== vendorId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      const updateData = {};

      if (data.title !== undefined) {
        const title = String(data.title).trim();
        if (!title || title.length < 3) {
          return sendError(res, 'Title must be at least 3 characters', 400, 'INVALID_TITLE');
        }
        updateData.title = title;
      }

      if (data.description !== undefined) {
        updateData.description = String(data.description).trim() || null;
      }

      const regularHourlyRate = Number(offer.turf?.pricePerHour || 500);

      if (data.discountType !== undefined || data.discountValue !== undefined) {
        const dType = (data.discountType || offer.discountType).toLowerCase();
        const dVal = data.discountValue !== undefined ? Number(data.discountValue) : Number(offer.discountValue);

        if (!['percentage', 'fixed'].includes(dType)) {
          return sendError(res, 'Invalid discount type', 400, 'INVALID_DISCOUNT_TYPE');
        }
        if (!Number.isFinite(dVal) || dVal <= 0) {
          return sendError(res, 'Discount value must be greater than 0', 400, 'INVALID_DISCOUNT_VALUE');
        }
        if (dType === 'percentage' && (dVal < 1 || dVal > 99)) {
          return sendError(res, 'Percentage must be between 1% and 99%', 400, 'INVALID_PERCENTAGE');
        }
        if (dType === 'fixed' && dVal >= regularHourlyRate) {
          return sendError(res, `Fixed price must be below regular price (₹${regularHourlyRate})`, 400, 'INVALID_FIXED_PRICE');
        }

        updateData.discountType = dType;
        updateData.discountValue = dVal;
      }

      if (data.scope !== undefined) {
        const scope = String(data.scope).toLowerCase();
        if (!['slot', 'day', 'weekdays', 'date_range'].includes(scope)) {
          return sendError(res, 'Invalid scope', 400, 'INVALID_SCOPE');
        }
        updateData.scope = scope;
      }

      const activeScope = updateData.scope || offer.scope;

      if (data.startDate !== undefined) updateData.startDate = String(data.startDate).slice(0, 10);
      if (data.endDate !== undefined) updateData.endDate = String(data.endDate).slice(0, 10);

      if (activeScope === 'day' || activeScope === 'slot') {
        if (updateData.startDate) {
          updateData.endDate = updateData.startDate;
        } else if (updateData.endDate && !updateData.startDate) {
          updateData.startDate = updateData.endDate;
        }
      }

      const effStart = updateData.startDate || offer.startDate;
      const effEnd = updateData.endDate || offer.endDate;

      if (activeScope !== 'day' && activeScope !== 'slot' && effStart && effEnd && effStart > effEnd) {
        return sendError(res, 'Start date cannot be after end date', 400, 'INVALID_DATE_RANGE');
      }

      if (data.applicableSlots !== undefined) {
        let slots = data.applicableSlots;
        if (typeof slots === 'string') {
          try { slots = JSON.parse(slots); } catch (e) { slots = slots.split(',').map((s) => s.trim()).filter(Boolean); }
        }
        updateData.applicableSlots = Array.isArray(slots) ? slots : [];
      }

      if (data.weekdays !== undefined) {
        let wd = data.weekdays;
        if (typeof wd === 'string') {
          try { wd = JSON.parse(wd); } catch (e) { wd = wd.split(',').map((s) => s.trim()).filter(Boolean); }
        }
        updateData.weekdays = Array.isArray(wd) ? wd : [];
      }

      if (req.file) {
        try {
          const uploadRes = await storageService.uploadFile(req.file, 'offers');
          updateData.bannerUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn('⚠️ Banner update upload failed:', uploadErr.message);
        }
      } else if (data.bannerUrl !== undefined) {
        updateData.bannerUrl = String(data.bannerUrl).trim() || null;
      }

      const updated = await prisma.offer.update({
        where: { id: offerId },
        data: updateData,
      });

      try {
        await cacheService.del(`turf:${turfId}`);
        await cacheService.invalidatePattern('turf*');
        await cacheService.invalidateSlots(turfId);
      } catch (cacheErr) {
        console.warn('Cache invalidation warning on updateOffer:', cacheErr.message);
      }

      return sendSuccess(res, {
        message: 'Offer updated successfully',
        offer: formatOffer(updated),
      });
    } catch (err) {
      console.error('vendorOfferController.updateOffer error:', err);
      return sendError(res, 'Failed to update offer', 500, 'UPDATE_OFFER_FAILED');
    }
  },

  /**
   * PATCH /api/vendor/turfs/:turfId/offers/:offerId/status
   * Toggle pause/resume on an offer
   */
  async toggleOfferStatus(req, res) {
    try {
      const vendorId = req.user.id || req.user.uid;
      const { turfId, offerId } = req.params;
      const { status } = req.body || {};

      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
      });

      if (!offer || offer.turfId !== turfId) {
        return sendError(res, 'Offer not found', 404, 'NOT_FOUND');
      }

      if (offer.vendorId !== vendorId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      const nextStatus = status ? String(status).toLowerCase() : (offer.status === 'active' ? 'paused' : 'active');
      if (!['active', 'paused'].includes(nextStatus)) {
        return sendError(res, 'Status must be "active" or "paused"', 400, 'INVALID_STATUS');
      }

      const updated = await prisma.offer.update({
        where: { id: offerId },
        data: { status: nextStatus },
      });

      try {
        await cacheService.del(`turf:${turfId}`);
        await cacheService.invalidatePattern('turf*');
        await cacheService.invalidateSlots(turfId);
      } catch (cacheErr) {
        console.warn('Cache invalidation warning on toggleOfferStatus:', cacheErr.message);
      }

      return sendSuccess(res, {
        message: `Offer ${nextStatus === 'active' ? 'resumed' : 'paused'} successfully`,
        offer: formatOffer(updated),
      });
    } catch (err) {
      console.error('vendorOfferController.toggleOfferStatus error:', err);
      return sendError(res, 'Failed to toggle offer status', 500, 'STATUS_TOGGLE_FAILED');
    }
  },

  /**
   * DELETE /api/vendor/turfs/:turfId/offers/:offerId
   * Delete an offer
   */
  async deleteOffer(req, res) {
    try {
      const vendorId = req.user.id || req.user.uid;
      const { turfId, offerId } = req.params;

      const offer = await prisma.offer.findUnique({
        where: { id: offerId },
      });

      if (!offer || offer.turfId !== turfId) {
        return sendError(res, 'Offer not found', 404, 'NOT_FOUND');
      }

      if (offer.vendorId !== vendorId && req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return sendError(res, 'Access denied', 403, 'FORBIDDEN');
      }

      await prisma.offer.delete({
        where: { id: offerId },
      });

      try {
        await cacheService.del(`turf:${turfId}`);
        await cacheService.invalidatePattern('turf*');
        await cacheService.invalidateSlots(turfId);
      } catch (cacheErr) {
        console.warn('Cache invalidation warning on deleteOffer:', cacheErr.message);
      }

      return sendSuccess(res, {
        message: 'Offer deleted successfully',
        offerId,
      });
    } catch (err) {
      console.error('vendorOfferController.deleteOffer error:', err);
      return sendError(res, 'Failed to delete offer', 500, 'DELETE_OFFER_FAILED');
    }
  },
};

module.exports = vendorOfferController;
