// utils/pricing.js
// Single source of truth for turf pricing, shared by:
//   - GET /turfs/:id/availability   (price shown on each slot)
//   - bookingService.reserveSlot    (price actually charged)
//
// Vendor prices live in turf.slotConfig.pricing:
//   base            -> also stored in turf.pricePerHour (REQUIRED)
//   evening         -> slots starting at/after 6 PM        (optional)
//   weekend         -> Saturday & Sunday                    (optional)
//   weekendEvening  -> weekend slots at/after 6 PM          (optional)
//   ball            -> equipment / ball add-on, info only   (optional)
// Any optional price that is missing/0 falls back to the base price.

const EVENING_START_MINS = 18 * 60; // 6 PM

const toMins = (t) => {
    const [h, m] = String(t || '0:0').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
};

const minsToTime = (mins) =>
    `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const positive = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
};

const getConfig = (turf) =>
    (turf && turf.slotConfig && typeof turf.slotConfig === 'object') ? turf.slotConfig : {};

const getSlotDurationMins = (turf) => positive(getConfig(turf).slotDurationMins) || 60;

const isWeekendDate = (dateStr) => {
    const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00Z`);
    const day = d.getUTCDay();
    return day === 0 || day === 6;
};

/** Hourly rate that applies to a slot starting at `startTime` on `dateStr`. */
function getHourlyRate(turf, dateStr, startTime) {
    const p = getConfig(turf).pricing || {};
    const base = positive(turf?.pricePerHour ?? turf?.price) ?? positive(p.base) ?? 500;
    const evening = toMins(startTime) >= EVENING_START_MINS;
    const weekend = isWeekendDate(dateStr);

    if (weekend && evening) {
        const higher = Math.max(positive(p.weekend) || 0, positive(p.evening) || 0);
        return positive(p.weekendEvening) ?? (higher > 0 ? higher : base);
    }
    if (weekend) return positive(p.weekend) ?? base;
    if (evening) return positive(p.evening) ?? base;
    return base;
}

/**
 * Check if an offer is currently active and applies to a given date and time slot.
 */
function isOfferApplicable(offer, dateStr, startTime, endTime) {
    if (!offer) return false;
    // Status must be active (not paused)
    if (offer.status !== 'active') return false;

    const cleanDate = String(dateStr).slice(0, 10);
    const startD = String(offer.startDate).slice(0, 10);
    const endD = String(offer.endDate).slice(0, 10);

    // Date range check
    if (cleanDate < startD || cleanDate > endD) return false;

    const scope = String(offer.scope || 'slot').toLowerCase();

    if (scope === 'slot') {
        const slots = Array.isArray(offer.applicableSlots) ? offer.applicableSlots : [];
        const slotKey = `${startTime}-${endTime}`;
        return slots.includes(startTime) || slots.includes(slotKey);
    }

    if (scope === 'day') {
        return true;
    }

    if (scope === 'weekdays') {
        const d = new Date(`${cleanDate}T00:00:00Z`);
        const dayNum = d.getUTCDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const dayName = dayNames[dayNum];
        const weekdays = Array.isArray(offer.weekdays) ? offer.weekdays : [];
        return weekdays.some((w) => {
            if (typeof w === 'number') return w === dayNum;
            const str = String(w).trim().toLowerCase();
            return str === dayName || str === String(dayNum);
        });
    }

    if (scope === 'date_range') {
        return true;
    }

    return false;
}

/**
 * Resolve the best applicable offer for a slot chunk.
 */
function resolveBestOffer(turf, dateStr, startTime, endTime, offers) {
    if (!offers || !Array.isArray(offers) || offers.length === 0) return null;

    const mins = toMins(endTime) - toMins(startTime);
    if (mins <= 0) return null;

    const regularRate = getHourlyRate(turf, dateStr, startTime);
    const regularPrice = (regularRate * mins) / 60;

    let best = null;
    let lowestPrice = regularPrice;

    for (const offer of offers) {
        if (!isOfferApplicable(offer, dateStr, startTime, endTime)) continue;

        let discountedPrice = regularPrice;
        const discountType = String(offer.discountType || 'percentage').toLowerCase();
        const discountVal = Number(offer.discountValue || 0);

        if (discountType === 'percentage' && discountVal > 0 && discountVal < 100) {
            discountedPrice = (regularPrice * (100 - discountVal)) / 100;
        } else if (discountType === 'fixed' && discountVal > 0) {
            // discountVal is the discounted hourly rate
            discountedPrice = (discountVal * mins) / 60;
        }

        discountedPrice = Math.round(discountedPrice);

        // Only accept if it actually offers a lower price than regular
        if (discountedPrice < lowestPrice && discountedPrice > 0) {
            lowestPrice = discountedPrice;
            best = {
                offer,
                discountedPrice,
                regularPrice: Math.round(regularPrice),
                saving: Math.round(regularPrice - discountedPrice),
                discountPercent: Math.round(((regularPrice - discountedPrice) / regularPrice) * 100),
            };
        }
    }

    return best;
}

/**
 * Price of ONE slot chunk (startTime -> endTime).
 * Precedence:
 * 1. Vendor per-slot price override in slot_overrides (manual block override)
 * 2. Active discount offer
 * 3. Base / evening / weekend hourly rate
 */
function getChunkPrice(turf, dateStr, startTime, endTime, overrides, offers) {
    const slotKey = `${startTime}-${endTime}`;
    if (overrides && overrides[slotKey] !== undefined) return Number(overrides[slotKey]);
    if (overrides && overrides[startTime] !== undefined) return Number(overrides[startTime]);

    const mins = toMins(endTime) - toMins(startTime);
    const regularPrice = (getHourlyRate(turf, dateStr, startTime) * mins) / 60;

    if (offers && Array.isArray(offers) && offers.length > 0) {
        const best = resolveBestOffer(turf, dateStr, startTime, endTime, offers);
        if (best) return best.discountedPrice;
    }

    return regularPrice;
}

/**
 * Detailed calculation for a booking range.
 */
function calculateRangePricing({ turf, date, startTime, endTime, overrides, offers }) {
    const step = getSlotDurationMins(turf);
    const startM = toMins(startTime);
    const endM = toMins(endTime);
    let total = 0;
    let regularTotal = 0;
    let appliedOffers = [];

    for (let cur = startM; cur < endM; cur += step) {
        const next = Math.min(cur + step, endM);
        const curStart = minsToTime(cur);
        const curEnd = minsToTime(next);

        const slotKey = `${curStart}-${curEnd}`;
        const hasOverride = overrides && (overrides[slotKey] !== undefined || overrides[curStart] !== undefined);
        const mins = next - cur;
        const regChunk = Math.round((getHourlyRate(turf, date, curStart) * mins) / 60);
        regularTotal += regChunk;

        if (hasOverride) {
            const overridePrice = Number(overrides[slotKey] ?? overrides[curStart]);
            total += overridePrice;
        } else {
            const best = resolveBestOffer(turf, date, curStart, curEnd, offers);
            if (best) {
                total += best.discountedPrice;
                if (!appliedOffers.some((o) => o.id === best.offer.id)) {
                    appliedOffers.push(best.offer);
                }
            } else {
                total += regChunk;
            }
        }
    }

    const finalTotal = Math.round(total);
    const finalReg = Math.round(regularTotal);
    const discountAmount = Math.max(0, finalReg - finalTotal);

    return {
        total: finalTotal,
        originalTotal: finalReg,
        discountAmount,
        appliedOffer: appliedOffers[0] || null,
        appliedOffers,
        hasDiscount: discountAmount > 0,
    };
}

/** Total price for a booking range, summed slot-by-slot. */
function priceForRange({ turf, date, startTime, endTime, overrides, offers }) {
    const res = calculateRangePricing({ turf, date, startTime, endTime, overrides, offers });
    return res.total;
}

module.exports = {
    getHourlyRate,
    getChunkPrice,
    priceForRange,
    calculateRangePricing,
    isOfferApplicable,
    resolveBestOffer,
    getSlotDurationMins,
    toMins,
    minsToTime,
};

