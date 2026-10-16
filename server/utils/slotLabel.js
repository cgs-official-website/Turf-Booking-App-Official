// Formats offer slot strings such as "14:00-15:00" into friendly 12-hour labels.
// Slots are stored in 24-hour "HH:MM-HH:MM" form; only the DISPLAY text changes.
// Example: ["16:00-17:00", "14:00-15:00", "15:00-16:00"]  ->  "2–5 PM"

const toMinutes = (t) => {
    const m = String(t || '').trim().match(/^(\d{1,2}):(\d{2})/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

const fmt = (mins) => {
    const h24 = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    const ap = h24 >= 12 ? 'PM' : 'AM';
    const h = h24 % 12 || 12;
    return { text: m ? `${h}:${String(m).padStart(2, '0')}` : `${h}`, ap };
};

const rangeLabel = (start, end) => {
    const a = fmt(start);
    const b = fmt(end);
    return a.ap === b.ap
        ? `${a.text}–${b.text} ${b.ap}`
        : `${a.text} ${a.ap} – ${b.text} ${b.ap}`;
};

/**
 * Sorts slots, merges back-to-back ones and returns a short label.
 * Returns '' when no valid slot is found.
 */
const formatSlotsLabel = (slots, max = 3) => {
    const ranges = [];
    (Array.isArray(slots) ? slots : []).forEach((slot) => {
        const [a, b] = String(slot).split('-');
        const start = toMinutes(a);
        if (start === null) return;
        let end = toMinutes(b);
        if (end === null) end = start + 60;
        if (end <= start) end += 24 * 60; // crosses midnight, e.g. 23:00-00:00
        ranges.push([start, end]);
    });

    ranges.sort((x, y) => x[0] - y[0]);

    const merged = [];
    ranges.forEach((r) => {
        const last = merged[merged.length - 1];
        if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
        else merged.push([r[0], r[1]]);
    });

    if (merged.length === 0) return '';
    const parts = merged.slice(0, max).map(([s, e]) => rangeLabel(s, e));
    return parts.join(', ') + (merged.length > max ? '...' : '');
};

module.exports = { formatSlotsLabel };


