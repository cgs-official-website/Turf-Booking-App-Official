/**
 * Super Admin — Tournaments Command Center (REAL DATA ONLY)
 *
 * Single source of truth = PostgreSQL `tournaments` table (Prisma), i.e. exactly what
 * the Vendor app / User app create and score. Nothing is read from the legacy
 * `documents` (firestoreService / local_db.json) store, so seed/dummy rows can never leak in.
 *
 * Status rules (no date guessing for "live"):
 *   live      -> any bracket match has status 'live'  OR tournament.status === 'ongoing'
 *   completed -> tournament.status === 'completed'    OR (published AND endDate < today)
 *   upcoming  -> tournament.status === 'published' (approved, not started)
 *   draft / pending_approval / rejected / cancelled -> not shown in this monitor
 */
const cacheService = require('../services/cacheService');
const prisma = require('../config/prisma');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const CACHE_TTL_ALL = 10; // seconds (UI polls every 15s, so live scores stay fresh)
const ALL_KEY = 'admin:tournaments:all';

async function invalidateAdminTournamentCache() {
  try {
    await cacheService.invalidatePattern('admin:tournaments:*');
  } catch (err) {
    console.warn('Cache invalidation warning:', err.message);
  }
}

/* ───────────────────────── helpers ───────────────────────── */

const asArray = (v) => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch (_) { return []; }
  }
  return [];
};

const teamName = (t) => (t ? t.name || t.teamName || '' : '');
const teamKey = (t) => String(t?.teamId || t?.id || '');

function bracketMatches(bracket) {
  const out = [];
  for (const round of bracket?.rounds || []) {
    for (const m of round.matches || []) out.push(m);
  }
  return out;
}

function deriveStatus(t, matches) {
  const s = String(t.status || '').toLowerCase();
  if (['draft', 'pending_approval', 'rejected', 'cancelled'].includes(s)) return null; // hidden
  if (s === 'completed') return 'completed';
  if (s === 'ongoing' || matches.some((m) => m.status === 'live')) return 'live';
  const today = new Date().toISOString().slice(0, 10);
  const end = String(t.endDate || '').slice(0, 10);
  if (end && today > end) return 'completed';
  return 'upcoming';
}

/** Roster = creator teams (tournaments.teams JSON) + accepted registrations. */
function buildTeams(t) {
  const creatorTeams = asArray(t.teams).map((tm) => ({
    teamId: tm.id || tm.teamId,
    id: tm.id || tm.teamId,
    name: teamName(tm),
    captain: { name: tm.captainName || tm.captain?.name || null, phone: tm.captainPhone || tm.captain?.phone || null },
    captainName: tm.captainName || tm.captain?.name || null,
    players: Array.isArray(tm.players) ? tm.players : [],
  }));
  const registered = (t.registrations || [])
    .filter((r) => r.status === 'accepted')
    .map((r) => ({
      teamId: r.id,
      id: r.id,
      name: r.teamName,
      captain: { name: r.captainName || null, phone: r.captainPhone || null },
      captainName: r.captainName || null,
      players: Array.isArray(r.players) ? r.players : [],
    }));
  return [...creatorTeams, ...registered];
}

function inningsScore(inn) {
  if (!inn) return null;
  return { runs: inn.runs || 0, wickets: inn.wickets || 0, overs: inn.overs ?? '0.0' };
}

/** Convert one bracket match -> fixture + matchData understood by the admin UI. */
function buildFixture(m, sport) {
  const lc = m.liveCricket || null;
  const inns = lc ? [lc.innings1, lc.innings2].filter(Boolean) : [];
  const scoreOf = (team) => {
    if (!team) return null;
    const inn = inns.find((i) => String(i.battingTeamId) === String(team.id));
    if (inn) return inningsScore(inn);
    const sc = m.score;
    if (sc) {
      const isA = String(m.teamA?.id) === String(team.id);
      const runs = isA ? sc.runsA : sc.runsB;
      if (runs !== undefined && runs !== null) {
        return { runs, wickets: (isA ? sc.wicketsA : sc.wicketsB) || 0, overs: (isA ? sc.oversA : sc.oversB) ?? null };
      }
    }
    return null;
  };

  const cur = lc ? (lc.currentInnings === 2 ? lc.innings2 : lc.innings1) : null;
  const batter = (id) => (cur && id ? cur.batters?.[id] : null);
  const striker = batter(cur?.currentStrikerId);
  const toss = m.toss
    ? { wonBy: m.toss.winnerName || m.toss.wonBy || null, decision: m.toss.decision || m.toss.electedTo || null }
    : null;
  const winnerName = teamName(m.winner) || null;

  return {
    id: m.id,
    matchId: m.id,
    roundName: m.roundName || null,
    matchCode: m.matchCode || null,
    teamA: m.teamA ? { teamId: m.teamA.id, id: m.teamA.id, name: teamName(m.teamA) } : null,
    teamB: m.teamB ? { teamId: m.teamB.id, id: m.teamB.id, name: teamName(m.teamB) } : null,
    scheduledAt: m.scheduledAt || m.completedAt || null,
    status: m.status,
    result: m.score?.summary || m.score?.winMarginText || null,
    winnerId: m.winner ? teamKey(m.winner) : null,
    winnerName,
    isBye: Boolean(m.isBye),
    matchData: {
      id: m.id,
      sport,
      status: m.status,
      toss,
      result: m.score?.summary || null,
      scoreA: scoreOf(m.teamA),
      scoreB: scoreOf(m.teamB),
      scorecard: {
        currentInning: lc?.currentInnings || null,
        overs: cur?.overs ?? null,
        target: lc?.target || null,
        battingTeam: cur?.battingTeamName || null,
        striker: striker ? striker.name || striker.playerName || null : null,
        resultText: m.score?.summary || null,
      },
    },
  };
}

function calculateStandings(teams = [], fixtures = []) {
  const map = new Map();
  teams.forEach((tm) => map.set(teamKey(tm), { teamId: teamKey(tm), name: tm.name, played: 0, won: 0, lost: 0, tied: 0, points: 0 }));
  fixtures.forEach((f) => {
    if (f.status !== 'completed' || f.isBye) return;
    const a = map.get(teamKey(f.teamA));
    const b = map.get(teamKey(f.teamB));
    if (!a || !b) return;
    a.played += 1; b.played += 1;
    if (f.winnerId === a.teamId) { a.won += 1; a.points += 2; b.lost += 1; }
    else if (f.winnerId === b.teamId) { b.won += 1; b.points += 2; a.lost += 1; }
    else { a.tied += 1; b.tied += 1; a.points += 1; b.points += 1; }
  });
  return [...map.values()].sort((x, y) => y.points - x.points || y.won - x.won || x.name.localeCompare(y.name));
}

function enrich(t) {
  const bracket = t.bracket && typeof t.bracket === 'object' ? t.bracket : {};
  const matches = bracketMatches(bracket);
  const status = deriveStatus(t, matches);
  if (!status) return null;

  const teams = buildTeams(t);
  const fixtures = matches.filter((m) => !m.isBye).map((m) => buildFixture(m, t.sport));
  const liveFixture = fixtures.find((f) => f.status === 'live') || null;

  const finalMatch = [...matches].reverse().find((m) => !m.nextMatchId && m.status === 'completed' && !m.isThirdPlaceMatch);
  const finalScore = finalMatch
    ? `${teamName(finalMatch.teamA)} ${finalMatch.score?.teamA || ''} vs ${teamName(finalMatch.teamB)} ${finalMatch.score?.teamB || ''}`.replace(/\s+/g, ' ').trim()
    : null;

  return {
    id: t.id,
    name: t.name,
    sport: t.sport,
    turfId: t.turfId,
    vendorId: t.vendorId,
    startDate: t.startDate,
    endDate: t.endDate,
    status,
    rawStatus: t.status,
    teams,
    fixtures,
    currentLiveMatch: liveFixture ? liveFixture.matchData : null,
    turf: {
      id: t.turf?.id || t.turfId || '',
      name: t.turf?.name || t.venueName || null,
      city: t.turf?.city || t.city || null,
      location: t.turf?.location || t.venueLocation || null,
    },
    vendor: t.vendor
      ? { id: t.vendor.id, name: t.vendor.name, phone: t.vendor.phone, email: t.vendor.email }
      : { id: '', name: t.user?.name || null, phone: t.contactPhone || t.user?.phone || null, email: t.contactEmail || null },
    winner: bracket.winner ? { name: teamName(bracket.winner) } : null,
    runnerUp: bracket.runnerUp ? { name: teamName(bracket.runnerUp) } : null,
    finalScore,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

async function loadAllEnriched() {
  const cached = await cacheService.get(ALL_KEY);
  if (cached) return cached;

  const rows = await prisma.tournament.findMany({
    where: { status: { in: ['published', 'ongoing', 'completed'] } },
    include: {
      turf: { select: { id: true, name: true, city: true, location: true } },
      vendor: { select: { id: true, name: true, phone: true, email: true } },
      user: { select: { id: true, name: true, phone: true } },
      registrations: { where: { status: 'accepted' } },
    },
    orderBy: { createdAt: 'desc' },
    take: 500,
  });
  const list = rows.map(enrich).filter(Boolean);
  await cacheService.set(ALL_KEY, list, CACHE_TTL_ALL);
  return list;
}

// Lists never ship the (large) fixtures unless needed by the card
const toListItem = (t) => (t.status === 'live' ? t : { ...t, fixtures: [], fixturesCount: t.fixtures.length });

const paginate = (items, cursor, take) => {
  let start = 0;
  if (cursor) {
    const idx = items.findIndex((t) => String(t.id) === String(cursor));
    if (idx !== -1) start = idx + 1;
  }
  const page = items.slice(start, start + take);
  const next = start + take < items.length && page.length ? page[page.length - 1].id : null;
  return { page, next };
};

/* ───────────────────────── controller ───────────────────────── */

const tournamentAdminController = {
  invalidateAdminTournamentCache,

  /** GET /api/v1/admin/tournaments */
  async getAllTournaments(req, res) {
    const { status, search, sport, turfId, limit = 50, cursor } = req.query;
    const take = Math.min(Math.max(Number(limit) || 50, 1), 100);
    try {
      const all = await loadAllEnriched();
      const stats = {
        total: all.length,
        upcoming: all.filter((t) => t.status === 'upcoming').length,
        live: all.filter((t) => t.status === 'live').length,
        completed: all.filter((t) => t.status === 'completed').length,
      };

      let list = all;
      if (status && status !== 'all') list = list.filter((t) => t.status === String(status).toLowerCase());
      if (sport && sport !== 'all') list = list.filter((t) => (t.sport || '').toLowerCase() === String(sport).toLowerCase());
      if (turfId) list = list.filter((t) => t.turfId === turfId);
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        list = list.filter((t) =>
          [t.name, t.sport, t.turf?.name, t.turf?.city].some((v) => (v || '').toLowerCase().includes(q)) ||
          t.teams.some((tm) => (tm.name || '').toLowerCase().includes(q)));
      }

      const { page, next } = paginate(list, cursor, take);
      const items = page.map(toListItem);
      return sendPaginated(res, items, next, { tournaments: items, stats, total: list.length, count: items.length });
    } catch (err) {
      console.error('getAllTournaments error:', err);
      return sendError(res, 'Failed to fetch tournaments', 500, 'FETCH_TOURNAMENTS_FAILED');
    }
  },

  /** GET /api/v1/admin/tournaments/history */
  async getTournamentHistory(req, res) {
    const { search, limit = 20, cursor } = req.query;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);
    try {
      let done = (await loadAllEnriched()).filter((t) => t.status === 'completed');
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        done = done.filter((t) => [t.name, t.turf?.name, t.winner?.name].some((v) => (v || '').toLowerCase().includes(q)));
      }
      done.sort((a, b) => new Date(b.endDate || b.createdAt || 0) - new Date(a.endDate || a.createdAt || 0));
      const { page, next } = paginate(done, cursor, take);
      const items = page.map((t) => ({ ...t, standings: calculateStandings(t.teams, t.fixtures), totalTeams: t.teams.length }));
      return sendPaginated(res, items, next, { items, total: done.length, count: items.length });
    } catch (err) {
      console.error('getTournamentHistory error:', err);
      return sendError(res, 'Failed to fetch tournament history', 500, 'FETCH_HISTORY_FAILED');
    }
  },

  /** GET /api/v1/admin/tournaments/:id */
  async getTournamentById(req, res) {
    const { id } = req.params;
    if (!id) return sendError(res, 'Tournament ID is required', 400, 'MISSING_ID');
    try {
      const t = (await loadAllEnriched()).find((x) => String(x.id) === String(id));
      if (!t) return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      return sendSuccess(res, { tournament: { ...t, standings: calculateStandings(t.teams, t.fixtures) } });
    } catch (err) {
      console.error('getTournamentById error:', err);
      return sendError(res, 'Failed to fetch tournament details', 500, 'FETCH_FAILED');
    }
  },

  /** GET /api/v1/admin/tournaments/:id/live */
  async getTournamentLiveScore(req, res) {
    const { id } = req.params;
    try {
      const t = (await loadAllEnriched()).find((x) => String(x.id) === String(id));
      if (!t) return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      const live = t.fixtures.find((f) => f.status === 'live');
      if (!live) {
        return sendSuccess(res, { isLive: false, tournamentId: t.id, tournamentName: t.name, sport: t.sport, status: t.status, lastUpdated: new Date().toISOString() });
      }
      return sendSuccess(res, { isLive: true, tournamentId: t.id, tournamentName: t.name, sport: t.sport, fixture: live, venue: t.turf?.name, lastUpdated: new Date().toISOString() });
    } catch (err) {
      console.error('getTournamentLiveScore error:', err);
      return sendError(res, 'Failed to fetch live score', 500, 'FETCH_LIVE_SCORE_FAILED');
    }
  },
};

module.exports = tournamentAdminController;
