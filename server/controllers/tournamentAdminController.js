const firestoreService = require('../services/firestoreService');
const cacheService = require('../services/cacheService');
const prisma = require('../config/prisma');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const CACHE_TTL_LIST = 120; // 2 minutes
const CACHE_TTL_DETAIL = 120; // 2 minutes
const CACHE_TTL_LIVE = 5; // 5 seconds for live scores

/**
 * Invalidate all admin tournament cache keys
 */
async function invalidateAdminTournamentCache() {
  try {
    await cacheService.invalidatePattern('admin:tournaments:*');
  } catch (err) {
    console.warn('Cache invalidation warning:', err.message);
  }
}

/**
 * Format status to standard 'upcoming' | 'live' | 'completed'
 */
function normalizeStatus(rawStatus, startDate, endDate) {
  const s = String(rawStatus || '').toLowerCase().trim();
  if (s === 'completed' || s === 'finished') return 'completed';
  if (s === 'live' || s === 'ongoing') return 'live';
  if (s === 'upcoming' || s === 'published' || s === 'scheduled' || s === 'draft') return 'upcoming';

  const today = new Date().toISOString().slice(0, 10);
  const start = String(startDate || '').slice(0, 10);
  const end = String(endDate || '').slice(0, 10);

  if (end && today > end) return 'completed';
  if (start && today >= start) return 'live';
  return 'upcoming';
}

/**
 * Calculate standings table from registered teams and tournament fixtures
 */
function calculateStandings(teams = [], fixtures = []) {
  const standingsMap = new Map();

  teams.forEach((team) => {
    const teamId = team.teamId || team.id;
    standingsMap.set(String(teamId), {
      teamId,
      name: team.name || `Team ${teamId}`,
      played: 0,
      won: 0,
      lost: 0,
      tied: 0,
      points: 0,
      runsScored: 0,
      runsConceded: 0,
      netRunRate: '0.00',
    });
  });

  fixtures.forEach((f) => {
    const isCompleted = f.status === 'completed' || f.matchData?.status === 'completed';
    if (!isCompleted) return;

    const teamAId = String(f.teamA?.teamId || f.teamA?.id || f.teamA || '');
    const teamBId = String(f.teamB?.teamId || f.teamB?.id || f.teamB || '');

    const teamA = standingsMap.get(teamAId);
    const teamB = standingsMap.get(teamBId);
    if (!teamA || !teamB) return;

    teamA.played += 1;
    teamB.played += 1;

    const winnerId = String(f.winnerId || f.matchData?.winnerId || '');
    const winnerName = f.winnerName || f.winner || f.matchData?.winner || '';
    const result = String(f.result || f.matchData?.resultText || f.matchData?.result || '').toLowerCase();

    if (winnerId === teamAId || (winnerName && winnerName === teamA.name)) {
      teamA.won += 1;
      teamA.points += 2;
      teamB.lost += 1;
    } else if (winnerId === teamBId || (winnerName && winnerName === teamB.name)) {
      teamB.won += 1;
      teamB.points += 2;
      teamA.lost += 1;
    } else if (result.includes('tie') || result.includes('draw')) {
      teamA.tied += 1;
      teamB.tied += 1;
      teamA.points += 1;
      teamB.points += 1;
    } else if (f.scoreA !== undefined && f.scoreB !== undefined) {
      if (Number(f.scoreA) > Number(f.scoreB)) {
        teamA.won += 1;
        teamA.points += 2;
        teamB.lost += 1;
      } else if (Number(f.scoreB) > Number(f.scoreA)) {
        teamB.won += 1;
        teamB.points += 2;
        teamA.lost += 1;
      } else {
        teamA.tied += 1;
        teamB.tied += 1;
        teamA.points += 1;
        teamB.points += 1;
      }
    }
  });

  return Array.from(standingsMap.values()).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.won !== a.won) return b.won - a.won;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Fetch and link live match data from existing `matches` collection
 */
async function enrichFixtureWithMatch(fixture) {
  if (!fixture || !fixture.matchId) return fixture;

  try {
    let match = await firestoreService.getDoc('matches', fixture.matchId);
    if (!match) {
      try {
        match = await prisma.match.findUnique({
          where: { id: fixture.matchId },
          include: { turf: true },
        });
      } catch (_) {}
    }

    if (!match) return fixture;

    const sc = match.scorecard || {};
    const inn = Array.isArray(sc.innings) && sc.innings.length > 0 ? sc.innings[0] : null;

    const runs = sc.runs !== undefined ? sc.runs : (inn?.runs || 0);
    const wickets = sc.wickets !== undefined ? sc.wickets : (inn?.wickets || 0);
    const overs = sc.overs !== undefined ? sc.overs : (inn?.overs || 0);
    const result = match.resultText || match.result || sc.resultText || sc.result || null;
    const matchStatus = match.status || fixture.status;

    return {
      ...fixture,
      status: matchStatus,
      matchData: {
        id: match.id,
        sport: match.sport,
        place: match.place,
        status: matchStatus,
        toss: match.toss || null,
        scorecard: sc,
        runs,
        wickets,
        overs,
        balls: sc.balls || 0,
        battingTeam: sc.battingTeam || fixture.teamA?.name || null,
        bowlingTeam: sc.bowlingTeam || fixture.teamB?.name || null,
        striker: sc.striker || null,
        nonStriker: sc.nonStriker || null,
        bowler: sc.bowler || null,
        recentBalls: sc.recentBalls || [],
        result,
        updatedAt: match.updatedAt,
      },
    };
  } catch (err) {
    console.warn(`Error enriching fixture ${fixture.matchId}:`, err.message);
    return fixture;
  }
}

/**
 * Enrich single tournament with Turf, Vendor, and normalized fields
 */
async function enrichTournament(t) {
  if (!t) return null;

  const turfId = t.turfId || t.turf_id;
  const vendorId = t.vendorId || t.vendor_id;

  let turf = t.turf || null;
  let vendor = t.vendor || null;

  if (turfId && (!turf || !turf.name)) {
    try {
      turf = await firestoreService.getDoc('turfs', turfId);
      if (!turf) {
        turf = await prisma.turf.findUnique({ where: { id: turfId } });
      }
    } catch (_) {}
  }

  if (vendorId && (!vendor || !vendor.name)) {
    try {
      vendor = await firestoreService.getDoc('vendors', vendorId);
      if (!vendor) {
        vendor = await prisma.vendor.findUnique({ where: { id: vendorId } });
      }
    } catch (_) {}
  }

  const normalizedStatus = normalizeStatus(t.status, t.startDate, t.endDate);

  let teams = [];
  if (Array.isArray(t.teams)) {
    teams = t.teams;
  } else if (typeof t.teams === 'string') {
    try { teams = JSON.parse(t.teams); } catch (_) { teams = []; }
  }

  let fixtures = [];
  if (Array.isArray(t.fixtures)) {
    fixtures = t.fixtures;
  } else if (typeof t.fixtures === 'string') {
    try { fixtures = JSON.parse(t.fixtures); } catch (_) { fixtures = []; }
  }

  return {
    ...t,
    id: t.id,
    name: t.name,
    sport: t.sport || 'Cricket',
    turfId,
    vendorId,
    startDate: t.startDate,
    endDate: t.endDate,
    status: normalizedStatus,
    rawStatus: t.status,
    teams,
    fixtures,
    turf: turf
      ? {
          id: turf.id,
          name: turf.name,
          city: turf.city,
          location: turf.location || turf.address || turf.city || '',
          images: turf.images || [],
        }
      : {
          id: turfId || '',
          name: t.venueName || 'Turf Arena',
          city: t.city || 'Chennai',
          location: t.venueLocation || t.city || 'Chennai',
          images: [],
        },
    vendor: vendor
      ? {
          id: vendor.id,
          name: vendor.name,
          phone: vendor.phone,
          email: vendor.email,
        }
      : {
          id: vendorId || '',
          name: t.vendorName || 'Turf Partner',
          phone: t.contactPhone || '',
          email: t.contactEmail || '',
        },
    winner: t.winner || null,
    runnerUp: t.runnerUp || null,
    finalScore: t.finalScore || null,
    createdAt: t.createdAt || new Date().toISOString(),
    updatedAt: t.updatedAt || new Date().toISOString(),
  };
}

/**
 * Fetch all tournaments from both Firestore and Prisma fallback
 */
async function fetchAllRawTournaments() {
  const tournamentMap = new Map();

  // 1. Fetch from Firestore collection (documents or local_db)
  try {
    const fsResult = await firestoreService.queryWithCursor('tournaments', { limit: 500 });
    if (Array.isArray(fsResult?.items)) {
      fsResult.items.forEach((item) => {
        if (item && item.id) tournamentMap.set(String(item.id), item);
      });
    }
  } catch (err) {
    console.warn('Error reading tournaments from firestoreService:', err.message);
  }

  // 2. Fetch from Prisma tournament table if available
  try {
    const prismaTournaments = await prisma.tournament.findMany({
      include: {
        turf: true,
        vendor: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    if (Array.isArray(prismaTournaments)) {
      prismaTournaments.forEach((pt) => {
        if (!tournamentMap.has(String(pt.id))) {
          tournamentMap.set(String(pt.id), pt);
        }
      });
    }
  } catch (_) {}

  return Array.from(tournamentMap.values());
}

const tournamentAdminController = {
  invalidateAdminTournamentCache,

  /**
   * GET /api/v1/admin/tournaments
   * List with status filter, search, and cursor pagination
   */
  async getAllTournaments(req, res) {
    const { status, search, sport, turfId, limit = 20, cursor } = req.query;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const cacheKey = `admin:tournaments:list:${JSON.stringify({ status, search, sport, turfId, limit: take, cursor })}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendPaginated(res, cached.tournaments, cached.nextCursor, {
        tournaments: cached.tournaments,
        stats: cached.stats,
        total: cached.total,
        count: cached.tournaments.length,
      });
    }

    try {
      const rawList = await fetchAllRawTournaments();
      const enrichedList = await Promise.all(rawList.map(enrichTournament));

      // Calculate overall platform stats
      const stats = {
        total: enrichedList.length,
        upcoming: enrichedList.filter((t) => t.status === 'upcoming').length,
        live: enrichedList.filter((t) => t.status === 'live').length,
        completed: enrichedList.filter((t) => t.status === 'completed').length,
      };

      // Filter by status
      let filtered = enrichedList;
      if (status && status !== 'all') {
        const s = String(status).toLowerCase().trim();
        filtered = filtered.filter((t) => t.status === s);
      }

      // Filter by sport
      if (sport && sport !== 'all') {
        const sp = String(sport).toLowerCase().trim();
        filtered = filtered.filter((t) => (t.sport || '').toLowerCase() === sp);
      }

      // Filter by turf
      if (turfId) {
        filtered = filtered.filter((t) => t.turfId === turfId);
      }

      // Search filter
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        filtered = filtered.filter((t) => {
          const matchName = (t.name || '').toLowerCase().includes(q);
          const matchSport = (t.sport || '').toLowerCase().includes(q);
          const matchTurf = (t.turf?.name || '').toLowerCase().includes(q);
          const matchCity = (t.turf?.city || '').toLowerCase().includes(q);
          const matchTeam = (t.teams || []).some((tm) => (tm.name || '').toLowerCase().includes(q));
          return matchName || matchSport || matchTurf || matchCity || matchTeam;
        });
      }

      // Sort by createdAt descending
      filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

      // Cursor pagination
      let startIndex = 0;
      if (cursor) {
        const cursorIdx = filtered.findIndex((t) => String(t.id) === String(cursor));
        if (cursorIdx !== -1) {
          startIndex = cursorIdx + 1;
        }
      }

      const paginatedItems = filtered.slice(startIndex, startIndex + take);
      const hasMore = startIndex + take < filtered.length;
      const nextCursor = hasMore && paginatedItems.length > 0 ? paginatedItems[paginatedItems.length - 1].id : null;

      // Link live match data to any tournament in live status
      const resultsWithLiveScores = await Promise.all(
        paginatedItems.map(async (t) => {
          if (t.status === 'live') {
            const enrichedFixtures = await Promise.all((t.fixtures || []).map(enrichFixtureWithMatch));
            const liveFixture = enrichedFixtures.find((f) => f.status === 'live' || f.matchData?.status === 'live');
            return {
              ...t,
              fixtures: enrichedFixtures,
              currentLiveMatch: liveFixture?.matchData || null,
            };
          }
          return t;
        })
      );

      const responsePayload = {
        tournaments: resultsWithLiveScores,
        nextCursor,
        total: filtered.length,
        stats,
      };

      await cacheService.set(cacheKey, responsePayload, CACHE_TTL_LIST);

      return sendPaginated(res, resultsWithLiveScores, nextCursor, {
        tournaments: resultsWithLiveScores,
        stats,
        total: filtered.length,
        count: resultsWithLiveScores.length,
      });
    } catch (err) {
      console.error('getAllTournaments error:', err);
      return sendError(res, 'Failed to fetch tournaments', 500, 'FETCH_TOURNAMENTS_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/tournaments/history
   * Completed tournaments with winner, runner-up, final score, turf, dates, and full fixtures
   */
  async getTournamentHistory(req, res) {
    const { search, limit = 20, cursor } = req.query;
    const take = Math.min(Math.max(Number(limit) || 20, 1), 100);

    const cacheKey = `admin:tournaments:history:${JSON.stringify({ search, limit: take, cursor })}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendPaginated(res, cached.items, cached.nextCursor, {
        items: cached.items,
        total: cached.total,
        count: cached.items.length,
      });
    }

    try {
      const rawList = await fetchAllRawTournaments();
      const enrichedList = await Promise.all(rawList.map(enrichTournament));

      // Filter only completed tournaments
      let completedTournaments = enrichedList.filter((t) => t.status === 'completed');

      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        completedTournaments = completedTournaments.filter((t) => {
          const matchName = (t.name || '').toLowerCase().includes(q);
          const matchTurf = (t.turf?.name || '').toLowerCase().includes(q);
          const matchWinner = (typeof t.winner === 'string' ? t.winner : t.winner?.name || '').toLowerCase().includes(q);
          return matchName || matchTurf || matchWinner;
        });
      }

      // Sort by endDate descending
      completedTournaments.sort((a, b) => new Date(b.endDate || b.createdAt || 0) - new Date(a.endDate || a.createdAt || 0));

      let startIndex = 0;
      if (cursor) {
        const cursorIdx = completedTournaments.findIndex((t) => String(t.id) === String(cursor));
        if (cursorIdx !== -1) {
          startIndex = cursorIdx + 1;
        }
      }

      const paginated = completedTournaments.slice(startIndex, startIndex + take);
      const hasMore = startIndex + take < completedTournaments.length;
      const nextCursor = hasMore && paginated.length > 0 ? paginated[paginated.length - 1].id : null;

      // Fully enrich each completed tournament's fixtures with match scorecard and standings for the drawer
      const detailedItems = await Promise.all(
        paginated.map(async (t) => {
          const enrichedFixtures = await Promise.all((t.fixtures || []).map(enrichFixtureWithMatch));
          const standings = calculateStandings(t.teams || [], enrichedFixtures);
          return {
            ...t,
            fixtures: enrichedFixtures,
            standings,
            totalTeams: (t.teams || []).length,
          };
        })
      );

      const responsePayload = {
        items: detailedItems,
        nextCursor,
        total: completedTournaments.length,
      };

      await cacheService.set(cacheKey, responsePayload, CACHE_TTL_LIST);

      return sendPaginated(res, detailedItems, nextCursor, {
        items: detailedItems,
        total: completedTournaments.length,
        count: detailedItems.length,
      });
    } catch (err) {
      console.error('getTournamentHistory error:', err);
      return sendError(res, 'Failed to fetch tournament history', 500, 'FETCH_HISTORY_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/tournaments/:id
   * Full detail: teams, fixtures linked to matches, standings, and venue
   */
  async getTournamentById(req, res) {
    const { id } = req.params;
    if (!id) return sendError(res, 'Tournament ID is required', 400, 'MISSING_ID');

    const cacheKey = `admin:tournaments:detail:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, { tournament: cached });
    }

    try {
      let raw = await firestoreService.getDoc('tournaments', id);
      if (!raw) {
        try {
          raw = await prisma.tournament.findUnique({
            where: { id },
            include: { turf: true, vendor: true },
          });
        } catch (_) {}
      }

      if (!raw) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const tournament = await enrichTournament(raw);

      // Link each fixture with the matches collection
      const enrichedFixtures = await Promise.all((tournament.fixtures || []).map(enrichFixtureWithMatch));

      // Compute standings
      const standings = calculateStandings(tournament.teams || [], enrichedFixtures);

      // Check for current live match
      const liveFixture = enrichedFixtures.find((f) => f.status === 'live' || f.matchData?.status === 'live');

      const fullDetail = {
        ...tournament,
        fixtures: enrichedFixtures,
        standings,
        currentLiveMatch: liveFixture?.matchData || null,
      };

      await cacheService.set(cacheKey, fullDetail, CACHE_TTL_DETAIL);

      return sendSuccess(res, { tournament: fullDetail });
    } catch (err) {
      console.error('getTournamentById error:', err);
      return sendError(res, 'Failed to fetch tournament details', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/tournaments/:id/live
   * Current live match score for 15-second polling
   */
  async getTournamentLiveScore(req, res) {
    const { id } = req.params;
    if (!id) return sendError(res, 'Tournament ID is required', 400, 'MISSING_ID');

    const cacheKey = `admin:tournaments:live:${id}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return sendSuccess(res, cached);
    }

    try {
      let raw = await firestoreService.getDoc('tournaments', id);
      if (!raw) {
        try {
          raw = await prisma.tournament.findUnique({ where: { id } });
        } catch (_) {}
      }

      if (!raw) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const tournament = await enrichTournament(raw);
      const fixtures = tournament.fixtures || [];

      // Find live fixture
      let liveFixture = fixtures.find((f) => f.status === 'live');
      let liveMatch = null;

      if (liveFixture && liveFixture.matchId) {
        liveMatch = await firestoreService.getDoc('matches', liveFixture.matchId);
        if (!liveMatch) {
          try {
            liveMatch = await prisma.match.findUnique({ where: { id: liveFixture.matchId } });
          } catch (_) {}
        }
      }

      // If not marked live directly, scan fixtures linked to live matches
      if (!liveMatch) {
        for (const f of fixtures) {
          if (f.matchId) {
            let m = await firestoreService.getDoc('matches', f.matchId);
            if (!m) {
              try {
                m = await prisma.match.findUnique({ where: { id: f.matchId } });
              } catch (_) {}
            }
            if (m && m.status === 'live') {
              liveFixture = f;
              liveMatch = m;
              break;
            }
          }
        }
      }

      if (!liveMatch) {
        const payload = {
          isLive: false,
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          sport: tournament.sport,
          status: tournament.status,
          message: 'No live match currently in progress for this tournament.',
          lastUpdated: new Date().toISOString(),
        };
        await cacheService.set(cacheKey, payload, CACHE_TTL_LIVE);
        return sendSuccess(res, payload);
      }

      const sc = liveMatch.scorecard || {};
      const inn = Array.isArray(sc.innings) && sc.innings.length > 0 ? sc.innings[0] : null;

      const teamA = liveFixture?.teamA || { name: 'Team A' };
      const teamB = liveFixture?.teamB || { name: 'Team B' };

      const payload = {
        isLive: true,
        tournamentId: tournament.id,
        tournamentName: tournament.name,
        sport: tournament.sport,
        fixtureId: liveFixture?.id || liveFixture?.matchId,
        matchId: liveMatch.id,
        teamA,
        teamB,
        status: 'live',
        toss: liveMatch.toss || null,
        scorecard: {
          runs: sc.runs !== undefined ? sc.runs : (inn?.runs || 0),
          wickets: sc.wickets !== undefined ? sc.wickets : (inn?.wickets || 0),
          overs: sc.overs !== undefined ? sc.overs : (inn?.overs || 0),
          balls: sc.balls || 0,
          currentInning: sc.currentInning || 1,
          battingTeam: sc.battingTeam || teamA.name,
          bowlingTeam: sc.bowlingTeam || teamB.name,
          striker: sc.striker || null,
          nonStriker: sc.nonStriker || null,
          bowler: sc.bowler || null,
          recentBalls: sc.recentBalls || [],
          target: sc.target || null,
          requiredRuns: sc.requiredRuns || null,
          remainingBalls: sc.remainingBalls || null,
          football: sc.football || null,
        },
        venue: tournament.turf?.name || tournament.venueName || 'Turf Stadium',
        lastUpdated: new Date().toISOString(),
      };

      await cacheService.set(cacheKey, payload, CACHE_TTL_LIVE);
      return sendSuccess(res, payload);
    } catch (err) {
      console.error('getTournamentLiveScore error:', err);
      return sendError(res, 'Failed to fetch live score', 500, 'FETCH_LIVE_SCORE_FAILED');
    }
  },
};

module.exports = tournamentAdminController;
