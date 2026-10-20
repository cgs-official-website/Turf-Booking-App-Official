const express = require('express');
const prisma = require('../config/prisma');
const { PUBLIC_BASE_URL } = require('../utils/shareUrl');

const router = express.Router();

const esc = (v) =>
    String(v === undefined || v === null ? '' : v)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

const fmtDate = (d) => {
    if (!d) return '';
    const dt = new Date(String(d).slice(0, 10));
    if (isNaN(dt.getTime())) return esc(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
};

const money = (n) => (Number(n) > 0 ? `₹${Number(n).toLocaleString('en-IN')}` : null);

function page({ title, description, body, status = 200 }) {
    return {
        status,
        html: `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:type" content="website">
<style>
  :root { --bg:#f4f7f6; --card:#fff; --text:#0f172a; --sub:#64748b; --line:#e2e8f0; --brand:#0f766e; --brand-soft:#e6f4f1; }
  @media (prefers-color-scheme: dark) {
    :root { --bg:#0b1412; --card:#13211e; --text:#f1f5f9; --sub:#94a3b8; --line:#23352f; --brand:#2dd4bf; --brand-soft:#12312c; }
  }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; background:var(--bg); color:var(--text); }
  .wrap { max-width:520px; margin:0 auto; padding:24px 16px 48px; }
  .brand { font-size:13px; font-weight:700; letter-spacing:.08em; text-transform:uppercase; color:var(--brand); margin-bottom:16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:20px; padding:22px; }
  .tag { display:inline-block; font-size:11px; font-weight:700; letter-spacing:.05em; text-transform:uppercase; color:var(--brand); background:var(--brand-soft); padding:4px 10px; border-radius:999px; }
  h1 { font-size:24px; line-height:1.25; margin:12px 0 4px; }
  .venue { color:var(--sub); font-size:14px; margin:0 0 18px; }
  dl { margin:0; }
  .row { display:flex; justify-content:space-between; gap:16px; padding:12px 0; border-top:1px solid var(--line); font-size:14px; }
  .row dt { color:var(--sub); }
  .row dd { margin:0; font-weight:600; text-align:right; }
  .note { margin-top:18px; padding:14px 16px; border-radius:14px; background:var(--brand-soft); font-size:13px; line-height:1.5; }
  .btn { display:block; margin-top:16px; text-align:center; text-decoration:none; background:var(--brand); color:#fff; font-weight:700; padding:14px; border-radius:14px; }
  @media (prefers-color-scheme: dark) { .btn { color:#06201c; } }
  p.empty { color:var(--sub); font-size:14px; line-height:1.6; }
</style>
</head>
<body><div class="wrap"><div class="brand">Turf Booking</div>${body}</div></body>
</html>`,
    };
}

router.get(['/tournament/:shareId', '/tournaments/:shareId', '/t/:shareId'], async (req, res) => {
    const shareId = String(req.params.shareId || '').trim();
    let t = null;
    try {
        t = await prisma.tournament.findFirst({
            where: { OR: [{ shareableIdentifier: shareId }, { id: shareId }] },
            include: { turf: { select: { name: true, city: true } } },
        });
    } catch (err) {
        console.error('Public tournament page error:', err);
        const out = page({
            title: 'Something went wrong',
            description: 'Please try again in a moment.',
            status: 500,
            body: '<div class="card"><h1>Something went wrong</h1><p class="empty">Please try again in a moment.</p></div>',
        });
        return res.status(out.status).type('html').send(out.html);
    }

    if (!t || t.status !== 'published') {
        const out = page({
            title: 'Tournament not available',
            description: 'This tournament link is no longer active or is unapproved.',
            status: 404,
            body: '<div class="card"><h1>Tournament not available</h1><p class="empty">This link is no longer active, unapproved, or has ended. Please ask the organiser for a fresh link, or open the Turf Booking app to browse live tournaments.</p></div>',
        });
        return res.status(out.status).type('html').send(out.html);
    }

    const today = new Date().toISOString().slice(0, 10);
    const regStart = t.registrationStartDate ? String(t.registrationStartDate).slice(0, 10) : (t.startDate ? String(t.startDate).slice(0, 10) : '');
    const regEnd = t.registrationEndDate ? String(t.registrationEndDate).slice(0, 10) : (t.endDate ? String(t.endDate).slice(0, 10) : '');
    const isRegNotOpen = Boolean(regStart && today < regStart);
    const isRegClosed = Boolean(regEnd && today > regEnd);
    const regStatusText = isRegClosed ? 'Registration Closed' : isRegNotOpen ? `Opens ${fmtDate(regStart)}` : 'Registration Open';

    const venue = t.venueName || t.turf?.name || '';
    const city = t.city || t.turf?.city || '';
    const rows = [
        ['Status', regStatusText],
        ['Dates', `${fmtDate(t.startDate)} – ${fmtDate(t.endDate)}`],
        t.registrationEndDate ? ['Register by', fmtDate(t.registrationEndDate)] : null,
        ['Teams', t.numberOfTeams],
        ['Players per team', t.playersPerTeam],
        t.oversPerTeam ? ['Overs per innings', t.oversPerTeam] : null,
        money(t.entryFee) ? ['Entry fee', money(t.entryFee)] : null,
        money(t.prizePool) ? ['Prize pool', money(t.prizePool)] : null,
    ].filter(Boolean);

    const appUrl = process.env.APP_DOWNLOAD_URL;
    const body = `<div class="card">
  <span class="tag">${esc(t.sport)} tournament</span>
  <h1>${esc(t.name)}</h1>
  <p class="venue">${esc([venue, city].filter(Boolean).join(' · '))}</p>
  <dl>${rows.map(([k, v]) => `<div class="row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
  ${t.description ? `<p class="empty">${esc(t.description)}</p>` : ''}
  <div class="note">To view live squads and register your team, open this tournament in the <strong>Turf Booking</strong> app.</div>
  <a class="btn" href="turfuserapp://tournament/${esc(shareId)}" style="margin-top:16px;">Open in Turf Booking App</a>
  ${appUrl ? `<a class="btn" href="${esc(appUrl)}" style="margin-top:8px;background:transparent;border:1px solid var(--brand);color:var(--brand);">Get the Turf Booking app</a>` : ''}
</div>`;

    const out = page({
        title: `${t.name} · ${t.sport} Tournament`,
        description: `${t.sport} tournament at ${venue}${city ? `, ${city}` : ''} · ${fmtDate(t.startDate)} to ${fmtDate(t.endDate)}`,
        body,
    });
    res.set('Cache-Control', 'public, max-age=60');
    return res.status(out.status).type('html').send(out.html);
});

module.exports = router;
