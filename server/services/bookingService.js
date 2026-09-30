const prisma = require('../config/prisma');
const firestoreService = require('./firestoreService');
const { query } = require('../config/db');

/**
 * Retry helper for transient DB connection errors (e.g. Railway proxy resets).
 * Safe for transactions because a dropped connection rolls the transaction back.
 */
async function withRetry(fn, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      const transient = ['P1001', 'P1002', 'P1008', 'P1017'].includes(e.code)
        || /ConnectionReset|forcibly closed/i.test(e.message || '');
      if (!transient || i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 300 * (i + 1)));
    }
  }
}

/**
 * Typed error for booking domain exceptions
 */
class BookingError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.name = 'BookingError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Generate unique booking ID matching current system format
 */
function generateBookingId() {
  return `booking_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
}

/**
 * Compute current date (YYYY-MM-DD) and time (HH:mm) in Asia/Kolkata timezone
 */
function getKolkataTimeInfo(inputDate = new Date()) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(inputDate);
  const m = {};
  for (const p of parts) m[p.type] = p.value;

  const dateStr = `${m.year}-${m.month}-${m.day}`; // YYYY-MM-DD
  const timeStr = `${m.hour}:${m.minute}`; // HH:mm
  return { dateStr, timeStr };
}

/**
 * Validate booking inputs (date format, calendar validity, 24h time, and range)
 */
function validateBookingInput({ date, startTime, endTime }) {
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new BookingError('Invalid booking date. Must be in YYYY-MM-DD format.', 400, 'INVALID_DATE');
  }

  const [y, m, d] = date.split('-').map(Number);
  const testDate = new Date(Date.UTC(y, m - 1, d));
  if (
    testDate.getUTCFullYear() !== y ||
    testDate.getUTCMonth() !== m - 1 ||
    testDate.getUTCDate() !== d
  ) {
    throw new BookingError('Date is not a valid calendar date.', 400, 'INVALID_DATE');
  }

  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!startTime || typeof startTime !== 'string' || !timeRegex.test(startTime)) {
    throw new BookingError('Invalid start time. Must be HH:mm (24-hour) format.', 400, 'INVALID_TIME');
  }

  if (!endTime || typeof endTime !== 'string' || !timeRegex.test(endTime)) {
    throw new BookingError('Invalid end time. Must be HH:mm (24-hour) format.', 400, 'INVALID_TIME');
  }

  if (endTime <= startTime) {
    throw new BookingError('End time must be strictly after start time.', 400, 'INVALID_TIME_RANGE');
  }

  return { dateObj: testDate };
}

/**
 * Resolve and validate court number based on turf data
 */
function resolveCourtNumber(turf, rawCourtNumber) {
  const maxCourts = parseInt(turf?.courtCount || turf?.numberOfCourts, 10) || 1;

  if (rawCourtNumber === undefined || rawCourtNumber === null || rawCourtNumber === '') {
    return 1;
  }

  const num = Number(rawCourtNumber);
  if (!Number.isInteger(num) || num < 1) {
    return 1;
  }

  if (num > maxCourts) {
    throw new BookingError(`Court number ${num} exceeds total available courts (${maxCourts})`, 400, 'INVALID_COURT');
  }

  return num;
}

/**
 * Map Prisma Booking row to legacy JSON response shape
 */
function toApi(row, { turf, user } = {}) {
  if (!row) return null;

  const dateStr = row.bookingDate instanceof Date
    ? row.bookingDate.toISOString().slice(0, 10)
    : String(row.bookingDate).slice(0, 10);

  const amountNum = Number(row.totalAmount);
  const paymentMethod = row.paymentMethod || null;

  let paymentMode = null;
  if (paymentMethod === 'cash') {
    paymentMode = 'hand_cash';
  } else if (paymentMethod === 'razorpay') {
    paymentMode = 'online';
  } else if (paymentMethod) {
    paymentMode = paymentMethod;
  }

  const reservedAt = row.createdAt ? (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt) : null;
  const requestedAt = row.requestedAt ? (row.requestedAt instanceof Date ? row.requestedAt.toISOString() : row.requestedAt) : null;
  const expiresAt = row.holdExpiresAt ? (row.holdExpiresAt instanceof Date ? row.holdExpiresAt.toISOString() : row.holdExpiresAt) : null;
  const createdAt = row.createdAt ? (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt) : null;
  const updatedAt = row.updatedAt ? (row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt) : null;

  const turfName = turf?.name || 'Turf Pitch';
  const turfAddress = turf?.address || turf?.location?.address || `${turf?.city || 'Tamil Nadu'}`;

  const resolvedTurf = turf || {
    name: turfName,
    address: turfAddress,
    images: ['https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800'],
  };

  return {
    id: row.bookingId,
    _id: row.bookingId,
    bookingId: row.bookingId,
    userId: row.userId,
    vendorId: row.vendorId,
    turfId: row.turfId,
    slotId: row.slotId || null,
    date: dateStr,
    startTime: row.startTime,
    endTime: row.endTime,
    amount: amountNum,
    totalAmount: amountNum,
    status: row.bookingStatus,
    bookingStatus: row.bookingStatus,
    paymentStatus: row.paymentStatus,
    paymentMethod,
    paymentMode,
    sport: row.sport || null,
    courtNumber: row.courtNumber || 1,
    razorpayOrderId: row.razorpayOrderId || null,
    razorpayPaymentId: row.razorpayPaymentId || null,
    reservedAt,
    requestedAt,
    expiresAt,
    rejectionReason: row.rejectionReason || null,
    cancellationReason: row.cancellationReason || null,
    reviewed: Boolean(row.isReviewed),
    isReviewed: Boolean(row.isReviewed),
    reviewId: row.reviewId || null,
    createdAt,
    updatedAt,
    turfName,
    turfAddress,
    turf: resolvedTurf,
    user: user || null,
  };
}

/**
 * Fetch multiple documents in a single SQL query (id = ANY(...))
 */
async function batchGetDocs(collectionName, ids) {
  const uniqueIds = [...new Set((ids || []).filter(Boolean).map(String))];
  const docMap = new Map();
  if (uniqueIds.length === 0) return docMap;

  try {
    const res = await query(
      'SELECT id, data FROM documents WHERE collection = $1 AND id = ANY($2::text[])',
      [collectionName, uniqueIds]
    );
    for (const r of res.rows) {
      docMap.set(r.id, { id: r.id, ...r.data });
    }
  } catch (err) {
    for (const id of uniqueIds) {
      const doc = await firestoreService.getDoc(collectionName, id);
      if (doc) docMap.set(id, doc);
    }
  }
  return docMap;
}

/**
 * Fetch relations for a single row
 */
async function populateRelations(row, { needTurf = true, needUser = false } = {}) {
  let turf = null;
  let user = null;

  if (needTurf && row.turfId) {
    try {
      turf = await firestoreService.getDoc('turfs', row.turfId);
    } catch (err) {
      turf = null;
    }
  }

  if (needUser && row.userId) {
    try {
      user = await firestoreService.getDoc('users', row.userId);
    } catch (err) {
      user = null;
    }
  }

  return toApi(row, { turf, user });
}

const bookingService = {
  BookingError,
  generateBookingId,
  resolveCourtNumber,
  validateBookingInput,
  getKolkataTimeInfo,
  toApi,

  /**
   * Reserve a 5-minute checkout hold on a slot (enforces courtNumber and active slot uniqueness)
   */
  async reserveSlot(turf, actor, payload) {
    if (!turf || !turf.id) {
      throw new BookingError('Turf not found', 404, 'TURF_NOT_FOUND');
    }

    if (!turf.vendorId) {
      throw new BookingError('Turf has no assigned vendor', 409, 'TURF_HAS_NO_VENDOR');
    }

    const { dateObj } = validateBookingInput(payload);
    const courtNumber = resolveCourtNumber(turf, payload.courtNumber);
    const price = turf.pricing?.baseRate || 800;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 5 * 60 * 1000);
    const bookingId = generateBookingId();

    try {
      const created = await withRetry(() => prisma.$transaction(async (tx) => {
        // 1. Clear expired reservations for this exact slot:
        // Delete rows with no razorpayOrderId
        await tx.booking.deleteMany({
          where: {
            turfId: turf.id,
            courtNumber,
            bookingDate: dateObj,
            startTime: payload.startTime,
            bookingStatus: 'reserved',
            holdExpiresAt: { lt: now },
            razorpayOrderId: null,
          },
        });

        // For expired reservations with a razorpayOrderId, transition to 'expired' so they exit active index
        await tx.booking.updateMany({
          where: {
            turfId: turf.id,
            courtNumber,
            bookingDate: dateObj,
            startTime: payload.startTime,
            bookingStatus: 'reserved',
            holdExpiresAt: { lt: now },
            razorpayOrderId: { not: null },
          },
          data: {
            bookingStatus: 'expired',
            updatedAt: now,
          },
        });

        // 2. Check for active clash on the specific court
        const existing = await tx.booking.findFirst({
          where: {
            turfId: turf.id,
            courtNumber,
            bookingDate: dateObj,
            startTime: payload.startTime,
            bookingStatus: { in: ['reserved', 'pending', 'confirmed'] },
          },
        });

        if (existing) {
          if (existing.bookingStatus === 'reserved' && existing.holdExpiresAt && existing.holdExpiresAt > now) {
            throw new BookingError('Slot is currently held by another user. Try again in a few minutes.', 409, 'SLOT_HELD');
          }
          throw new BookingError('Slot already booked or pending', 409, 'SLOT_UNAVAILABLE');
        }

        // 3. Insert new reservation
        return await tx.booking.create({
          data: {
            bookingId,
            userId: actor.uid,
            vendorId: turf.vendorId,
            turfId: turf.id,
            slotId: null,
            bookingDate: dateObj,
            startTime: payload.startTime,
            endTime: payload.endTime,
            totalAmount: price,
            bookingStatus: 'reserved',
            paymentStatus: 'pending',
            courtNumber,
            sport: payload.sport || (turf.sportTypes ? turf.sportTypes[0] : 'General'),
            holdExpiresAt: expiresAt,
            createdAt: now,
            updatedAt: now,
          },
        });
      }));

      return toApi(created, { turf });
    } catch (err) {
      if (err.code === 'P2002') {
        const conflict = await prisma.booking.findFirst({
          where: {
            turfId: turf.id,
            courtNumber,
            bookingDate: dateObj,
            startTime: payload.startTime,
            bookingStatus: { in: ['reserved', 'pending', 'confirmed'] },
          },
        });
        if (conflict?.bookingStatus === 'reserved' && conflict.holdExpiresAt && conflict.holdExpiresAt > new Date()) {
          throw new BookingError('Slot is currently held by another user. Try again in a few minutes.', 409, 'SLOT_HELD');
        }
        throw new BookingError('Slot already booked or pending', 409, 'SLOT_UNAVAILABLE');
      }
      throw err;
    }
  },

  /**
   * Cash Flow: Transition reserved -> pending
   */
  async confirmCashBooking(bookingId, actor) {
    const booking = await prisma.booking.findUnique({ where: { bookingId } });
    if (!booking) {
      throw new BookingError('Booking not found', 404, 'NOT_FOUND');
    }

    if (actor.role !== 'admin' && !actor.admin && booking.userId !== actor.uid) {
      throw new BookingError('Access denied', 403, 'FORBIDDEN');
    }

    if (booking.bookingStatus !== 'reserved') {
      if (booking.bookingStatus === 'pending') {
        return { updated: false, booking: await populateRelations(booking, { needTurf: true }) };
      }
      throw new BookingError(`Cannot confirm cash booking with status '${booking.bookingStatus}'`, 409, 'INVALID_STATUS');
    }

    const now = new Date();
    const updateResult = await prisma.booking.updateMany({
      where: {
        bookingId,
        bookingStatus: 'reserved',
      },
      data: {
        bookingStatus: 'pending',
        paymentMethod: 'cash',
        requestedAt: now,
        holdExpiresAt: null,
        updatedAt: now,
      },
    });

    const updatedRow = await prisma.booking.findUnique({ where: { bookingId } });
    return {
      updated: updateResult.count === 1,
      booking: await populateRelations(updatedRow, { needTurf: true }),
    };
  },

  /**
   * Online Flow: Set Razorpay order id while in reserved state
   */
  async attachRazorpayOrder(bookingId, actor, razorpayOrderId) {
    const booking = await prisma.booking.findUnique({ where: { bookingId } });
    if (!booking) {
      throw new BookingError('Booking not found', 404, 'NOT_FOUND');
    }

    if (actor.role !== 'admin' && !actor.admin && booking.userId !== actor.uid) {
      throw new BookingError('Access denied', 403, 'FORBIDDEN');
    }

    if (booking.bookingStatus !== 'reserved') {
      throw new BookingError(`Cannot create payment order for booking with status '${booking.bookingStatus}'`, 409, 'INVALID_STATUS');
    }

    const now = new Date();
    const updated = await prisma.booking.update({
      where: { bookingId },
      data: {
        razorpayOrderId,
        paymentMethod: 'razorpay',
        updatedAt: now,
      },
    });

    return populateRelations(updated, { needTurf: true });
  },

  /**
   * Online Flow: Transition reserved -> confirmed after verified Razorpay payment
   */
  async confirmRazorpayPayment(bookingId, actor, { razorpayPaymentId, razorpayOrderId }) {
    const booking = await prisma.booking.findUnique({ where: { bookingId } });
    if (!booking) {
      throw new BookingError('Booking not found', 404, 'NOT_FOUND');
    }

    if (actor.role !== 'admin' && !actor.admin && booking.userId !== actor.uid) {
      throw new BookingError('Access denied', 403, 'FORBIDDEN');
    }

    if (booking.bookingStatus === 'confirmed') {
      return { updated: false, booking: await populateRelations(booking, { needTurf: true }) };
    }

    if (booking.bookingStatus !== 'reserved') {
      throw new BookingError(`Cannot verify payment for booking with status '${booking.bookingStatus}'`, 409, 'INVALID_STATUS');
    }

    const now = new Date();
    const updateResult = await prisma.booking.updateMany({
      where: {
        bookingId,
        bookingStatus: 'reserved',
      },
      data: {
        bookingStatus: 'confirmed',
        paymentStatus: 'success',
        paymentMethod: 'razorpay',
        razorpayPaymentId: razorpayPaymentId || booking.razorpayPaymentId,
        razorpayOrderId: razorpayOrderId || booking.razorpayOrderId,
        holdExpiresAt: null,
        updatedAt: now,
      },
    });

    const updatedRow = await prisma.booking.findUnique({ where: { bookingId } });
    return {
      updated: updateResult.count === 1,
      booking: await populateRelations(updatedRow, { needTurf: true }),
    };
  },

  /**
   * Webhook Flow: Idempotent confirmation by razorpayOrderId
   */
  async confirmByRazorpayOrderId(razorpayOrderId, { razorpayPaymentId }) {
    const booking = await prisma.booking.findFirst({ where: { razorpayOrderId } });
    if (!booking) {
      return { found: false, updated: false, booking: null };
    }

    if (booking.bookingStatus === 'confirmed') {
      return { found: true, updated: false, booking: await populateRelations(booking, { needTurf: true }) };
    }

    if (booking.bookingStatus !== 'reserved') {
      return { found: true, updated: false, booking: await populateRelations(booking, { needTurf: true }) };
    }

    const now = new Date();
    const updateResult = await prisma.booking.updateMany({
      where: {
        bookingId: booking.bookingId,
        bookingStatus: 'reserved',
      },
      data: {
        bookingStatus: 'confirmed',
        paymentStatus: 'success',
        paymentMethod: 'razorpay',
        razorpayPaymentId: razorpayPaymentId || booking.razorpayPaymentId,
        holdExpiresAt: null,
        updatedAt: now,
      },
    });

    const updatedRow = await prisma.booking.findUnique({ where: { bookingId: booking.bookingId } });
    return {
      found: true,
      updated: updateResult.count === 1,
      booking: await populateRelations(updatedRow, { needTurf: true }),
    };
  },

  /**
   * Vendor Action: Accept or Reject a pending booking
   */
  async updateStatusByVendor(bookingId, actor, { status, rejectionReason }) {
    if (!['confirmed', 'rejected'].includes(status)) {
      throw new BookingError(`Invalid target status '${status}'. Must be 'confirmed' or 'rejected'`, 400, 'INVALID_STATUS');
    }

    const booking = await prisma.booking.findUnique({ where: { bookingId } });
    if (!booking) {
      throw new BookingError('Booking not found', 404, 'NOT_FOUND');
    }

    if (actor.role !== 'admin' && !actor.admin && booking.vendorId !== actor.uid) {
      throw new BookingError('Access denied: You do not own this booking', 403, 'FORBIDDEN');
    }

    if (booking.bookingStatus !== 'pending') {
      throw new BookingError(`Cannot ${status === 'confirmed' ? 'accept' : 'reject'} booking with status '${booking.bookingStatus}'`, 409, 'INVALID_STATUS');
    }

    const now = new Date();
    const updateResult = await prisma.booking.updateMany({
      where: {
        bookingId,
        bookingStatus: 'pending',
        vendorId: booking.vendorId,
      },
      data: {
        bookingStatus: status,
        rejectionReason: status === 'rejected' ? (rejectionReason || 'Rejected by vendor') : null,
        updatedAt: now,
      },
    });

    const updatedRow = await prisma.booking.findUnique({ where: { bookingId } });
    return {
      updated: updateResult.count === 1,
      booking: await populateRelations(updatedRow, { needTurf: true, needUser: true }),
    };
  },

  /**
   * User or Admin Cancellation (records cancellationReason)
   */
  async cancelBooking(bookingId, actor, { reason } = {}) {
    const booking = await prisma.booking.findUnique({ where: { bookingId } });
    if (!booking) {
      throw new BookingError('Booking not found', 404, 'NOT_FOUND');
    }

    if (actor.role !== 'admin' && !actor.admin && booking.userId !== actor.uid) {
      throw new BookingError('Access denied: You cannot cancel this booking', 403, 'FORBIDDEN');
    }

    if (!['pending', 'confirmed'].includes(booking.bookingStatus)) {
      throw new BookingError(`Cannot cancel booking with status '${booking.bookingStatus}'`, 409, 'INVALID_STATUS');
    }

    const now = new Date();
    const updateResult = await prisma.booking.updateMany({
      where: {
        bookingId,
        bookingStatus: { in: ['pending', 'confirmed'] },
      },
      data: {
        bookingStatus: 'cancelled',
        cancellationReason: reason || 'Cancelled by user',
        updatedAt: now,
      },
    });

    const updatedRow = await prisma.booking.findUnique({ where: { bookingId } });
    return {
      updated: updateResult.count === 1,
      booking: await populateRelations(updatedRow, { needTurf: true }),
    };
  },

  /**
   * Add Review to completed or confirmed booking
   */
  async attachReview(bookingId, actor, { reviewId }) {
    const booking = await prisma.booking.findUnique({ where: { bookingId } });
    if (!booking) {
      throw new BookingError('Booking not found', 404, 'NOT_FOUND');
    }

    if (actor.role !== 'admin' && !actor.admin && booking.userId !== actor.uid) {
      throw new BookingError('Access denied', 403, 'FORBIDDEN');
    }

    const updated = await prisma.booking.update({
      where: { bookingId },
      data: {
        isReviewed: true,
        reviewId: String(reviewId),
        updatedAt: new Date(),
      },
    });

    return populateRelations(updated, { needTurf: true });
  },

  /**
   * Single Booking Detail with relation lookups
   */
  async getById(bookingId, { includeRelations = true, needUser = false } = {}) {
    const row = await prisma.booking.findUnique({ where: { bookingId } });
    if (!row) return null;

    if (!includeRelations) {
      return toApi(row);
    }

    return populateRelations(row, { needTurf: true, needUser });
  },

  /**
   * Lookup booking by Razorpay Order ID
   */
  async findByRazorpayOrderId(razorpayOrderId) {
    if (!razorpayOrderId) return null;
    const row = await prisma.booking.findFirst({ where: { razorpayOrderId } });
    if (!row) return null;
    return populateRelations(row, { needTurf: true });
  },

  /**
   * List bookings for a player (single batch query for turfs, keyset pagination)
   */
  async listForUser(uid, { status, limit = 50, cursor } = {}) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const where = { userId: uid };

    if (status && status !== 'all') {
      where.bookingStatus = status;
    }

    if (cursor) {
      const cursorRow = await prisma.booking.findUnique({ where: { bookingId: cursor } });
      if (cursorRow) {
        where.OR = [
          { createdAt: { lt: cursorRow.createdAt } },
          {
            createdAt: cursorRow.createdAt,
            bookingId: { lt: cursorRow.bookingId },
          },
        ];
      }
    }

    const rows = await prisma.booking.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
        { bookingId: 'desc' },
      ],
      take: take + 1,
    });

    const hasNext = rows.length > take;
    const items = hasNext ? rows.slice(0, take) : rows;
    const nextCursor = hasNext && items.length > 0 ? items[items.length - 1].bookingId : null;

    // Single query batch fetch for all referenced turfs
    const turfMap = await batchGetDocs('turfs', items.map((b) => b.turfId));
    const populated = items.map((b) => toApi(b, { turf: turfMap.get(b.turfId) }));

    return { items: populated, nextCursor };
  },

  /**
   * List bookings for a vendor (single batch query for turfs and users, keyset pagination)
   */
  async listForVendor(uid, { status, date, turfId, limit = 50, cursor } = {}) {
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const where = {
      vendorId: uid,
      bookingStatus: { not: 'reserved' },
    };

    if (status && status !== 'all') {
      if (status !== 'reserved') {
        where.bookingStatus = status;
      }
    }

    if (turfId) {
      where.turfId = turfId;
    }

    if (date) {
      where.bookingDate = new Date(`${date}T00:00:00.000Z`);
    }

    if (cursor) {
      const cursorRow = await prisma.booking.findUnique({ where: { bookingId: cursor } });
      if (cursorRow) {
        where.OR = [
          { createdAt: { lt: cursorRow.createdAt } },
          {
            createdAt: cursorRow.createdAt,
            bookingId: { lt: cursorRow.bookingId },
          },
        ];
      }
    }

    const rows = await prisma.booking.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
        { bookingId: 'desc' },
      ],
      take: take + 1,
    });

    const hasNext = rows.length > take;
    const items = hasNext ? rows.slice(0, take) : rows;
    const nextCursor = hasNext && items.length > 0 ? items[items.length - 1].bookingId : null;

    // Single batch query for turfs and users
    const [turfMap, userMap] = await Promise.all([
      batchGetDocs('turfs', items.map((b) => b.turfId)),
      batchGetDocs('users', items.map((b) => b.userId)),
    ]);

    const populated = items.map((b) => toApi(b, {
      turf: turfMap.get(b.turfId),
      user: userMap.get(b.userId),
    }));

    return { items: populated, nextCursor };
  },

  /**
   * Active bookings for slot availability check
   */
  async activeForSlot(turfId, date) {
    const dateObj = new Date(`${date}T00:00:00.000Z`);
    const now = new Date();

    const rows = await prisma.booking.findMany({
      where: {
        turfId,
        bookingDate: dateObj,
        bookingStatus: { in: ['reserved', 'pending', 'confirmed'] },
        OR: [
          { bookingStatus: { in: ['pending', 'confirmed'] } },
          { bookingStatus: 'reserved', holdExpiresAt: { gt: now } },
        ],
      },
      select: {
        bookingId: true,
        turfId: true,
        courtNumber: true,
        bookingDate: true,
        startTime: true,
        endTime: true,
        bookingStatus: true,
        holdExpiresAt: true,
      },
    });

    return rows.map((r) => ({
      ...r,
      court_number: r.courtNumber,
      date: date,
      status: r.bookingStatus,
    }));
  },

  /**
   * Admin booking list (single batch query for turfs and users, keyset pagination)
   */
  async getAllBookingsAdmin({ status, turfId, limit = 50, cursor } = {}) {
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const where = {};

    if (status && status !== 'all') {
      where.bookingStatus = status;
    }

    if (turfId) {
      where.turfId = turfId;
    }

    if (cursor) {
      const cursorRow = await prisma.booking.findUnique({ where: { bookingId: cursor } });
      if (cursorRow) {
        where.OR = [
          { createdAt: { lt: cursorRow.createdAt } },
          {
            createdAt: cursorRow.createdAt,
            bookingId: { lt: cursorRow.bookingId },
          },
        ];
      }
    }

    const rows = await prisma.booking.findMany({
      where,
      orderBy: [
        { createdAt: 'desc' },
        { bookingId: 'desc' },
      ],
      take: take + 1,
    });

    const hasNext = rows.length > take;
    const items = hasNext ? rows.slice(0, take) : rows;
    const nextCursor = hasNext && items.length > 0 ? items[items.length - 1].bookingId : null;

    // Single batch query for turfs and users
    const [turfMap, userMap] = await Promise.all([
      batchGetDocs('turfs', items.map((b) => b.turfId)),
      batchGetDocs('users', items.map((b) => b.userId)),
    ]);

    const populated = items.map((b) => toApi(b, {
      turf: turfMap.get(b.turfId),
      user: userMap.get(b.userId),
    }));

    return { items: populated, nextCursor };
  },

  /**
   * Admin aggregation stats
   */
  async getAdminStats() {
    const groups = await prisma.booking.groupBy({
      by: ['bookingStatus'],
      _count: { bookingId: true },
      _sum: { totalAmount: true },
    });

    let totalBookings = 0;
    let confirmedCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;
    let completedCount = 0;
    let totalRevenue = 0;

    for (const g of groups) {
      const count = g._count.bookingId || 0;
      const amount = Number(g._sum.totalAmount || 0);

      // Exclude internal reserved checkout holds from aggregate metrics
      if (!['reserved', 'expired'].includes(g.bookingStatus)) {
        totalBookings += count;
      }

      if (g.bookingStatus === 'confirmed') {
        confirmedCount = count;
        totalRevenue += amount;
      } else if (g.bookingStatus === 'pending') {
        pendingCount = count;
      } else if (g.bookingStatus === 'cancelled') {
        cancelledCount = count;
      } else if (g.bookingStatus === 'completed') {
        completedCount = count;
        totalRevenue += amount;
      }
    }

    return {
      totalBookings,
      confirmedCount,
      pendingCount,
      cancelledCount,
      completedCount,
      totalRevenue,
    };
  },

  /**
   * Cron Job 1: Auto-complete confirmed bookings past end time (using Asia/Kolkata timezone)
   */
  async autoCompleteConfirmedBookings(now = new Date()) {
    const { dateStr: todayKolkataDate, timeStr: currentKolkataTime } = getKolkataTimeInfo(now);
    const todayDateObj = new Date(`${todayKolkataDate}T00:00:00.000Z`);

    // Target bookings confirmed on past dates or today whose endTime <= currentKolkataTime
    const candidates = await prisma.booking.findMany({
      where: {
        bookingStatus: 'confirmed',
        OR: [
          { bookingDate: { lt: todayDateObj } },
          {
            bookingDate: todayDateObj,
            endTime: { lte: currentKolkataTime },
          },
        ],
      },
      select: { bookingId: true },
      take: 200,
    });

    let completedCount = 0;
    for (const item of candidates) {
      const result = await prisma.booking.updateMany({
        where: {
          bookingId: item.bookingId,
          bookingStatus: 'confirmed',
        },
        data: {
          bookingStatus: 'completed',
          updatedAt: new Date(),
        },
      });
      if (result.count === 1) completedCount++;
    }

    return completedCount;
  },

  /**
   * Cron Job 2: Clean up expired reserved checkout holds
   * NEVER deletes rows that have a razorpayOrderId.
   */
  async cleanupExpiredReservations(now = new Date()) {
    // 1. Delete expired holds with NO razorpayOrderId
    const deleted = await prisma.booking.deleteMany({
      where: {
        bookingStatus: 'reserved',
        holdExpiresAt: { lt: now },
        razorpayOrderId: null,
      },
    });

    // 2. Mark expired holds with a razorpayOrderId as 'expired' so they exit active index
    const markedExpired = await prisma.booking.updateMany({
      where: {
        bookingStatus: 'reserved',
        holdExpiresAt: { lt: now },
        razorpayOrderId: { not: null },
      },
      data: {
        bookingStatus: 'expired',
        updatedAt: now,
      },
    });

    return deleted.count + markedExpired.count;
  },
};

module.exports = bookingService;
