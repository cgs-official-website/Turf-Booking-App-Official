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
 * Price of ONE slot chunk (startTime -> endTime).
 * A vendor price override for this exact slot (slot_overrides.priceOverrides) wins.
 */
function getChunkPrice(turf, dateStr, startTime, endTime, overrides) {
    const slotKey = `${startTime}-${endTime}`;
    if (overrides && overrides[slotKey] !== undefined) return Number(overrides[slotKey]);
    if (overrides && overrides[startTime] !== undefined) return Number(overrides[startTime]);
    const mins = toMins(endTime) - toMins(startTime);
    return (getHourlyRate(turf, dateStr, startTime) * mins) / 60;
}

/** Total price for a booking range, summed slot-by-slot (handles 30 min / 60 min slots and 5:30-6:30 PM style ranges). */
function priceForRange({ turf, date, startTime, endTime, overrides }) {
    const step = getSlotDurationMins(turf);
    const startM = toMins(startTime);
    const endM = toMins(endTime);
    let total = 0;
    for (let cur = startM; cur < endM; cur += step) {
        const next = Math.min(cur + step, endM);
        total += getChunkPrice(turf, date, minsToTime(cur), minsToTime(next), overrides);
    }
    return Math.round(total);
}

module.exports = {
    getHourlyRate,
    getChunkPrice,
    priceForRange,
    getSlotDurationMins,
    toMins,
    minsToTime,
};
