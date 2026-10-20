/**
 * Public base URL used in shareable links.
 *
 * `turfbookingapp.com` is not wired to this backend, so links using it showed
 * "This site can't be reached". Links now point at the backend itself, which serves
 * a public landing page at /tournament/:shareId.
 *
 * When a custom domain is connected to the Railway service, set
 * PUBLIC_BASE_URL=https://yourdomain.com in Railway variables, no code change needed.
 */
const DEFAULT_PUBLIC_BASE_URL = 'https://turf-booking-app-official-production.up.railway.app';

const PUBLIC_BASE_URL = String(process.env.PUBLIC_BASE_URL || DEFAULT_PUBLIC_BASE_URL).replace(/\/+$/, '');

function tournamentShareUrl(shareId, turfId) {
    if (!shareId) return null;
    return `${PUBLIC_BASE_URL}/tournament/${shareId}${turfId ? `?turfId=${encodeURIComponent(turfId)}` : ''}`;
}

module.exports = { PUBLIC_BASE_URL, tournamentShareUrl };
