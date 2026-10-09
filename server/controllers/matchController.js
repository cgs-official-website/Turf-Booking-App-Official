const crypto = require('crypto');
const prisma = require('../config/prisma');
const notificationService = require('../services/notificationService');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const {
  createMatchSchema,
  joinMatchSchema,
  updateTeamsSchema,
  tossSchema,
  updateScorecardSchema,
} = require('../utils/validators');

const generateJoinCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars, e.g. "9F4A2B"
};

function formatMatch(m, userMap = {}) {
  if (!m) return null;
  const playerIds = (m.players || []).map((p) => (typeof p === 'string' ? p : p.userId));
  const scorecard = m.scorecard && typeof m.scorecard === 'object' ? m.scorecard : {};

  const playerNames = {};

  // 1. Fill from userMap (registered users)
  playerIds.forEach((uid) => {
    if (userMap[uid]) {
      playerNames[uid] = userMap[uid];
    }
  });

  // 2. Fill from teams.A.players and teams.B.players
  const teamsObj = m.teams || scorecard.teams || {};
  ['A', 'B', 'teamA', 'teamB'].forEach((key) => {
    const t = teamsObj[key];
    if (t && Array.isArray(t.players)) {
      t.players.forEach((p) => {
        if (p && typeof p === 'object' && (p.id || p.userId) && p.name) {
          playerNames[p.id || p.userId] = p.name;
        }
      });
    }
  });

  // 3. Fill from scorecard.playerNames if present
  if (scorecard.playerNames) {
    Object.assign(playerNames, scorecard.playerNames);
  }

  // Ensure creator name is mapped
  if (m.createdBy) {
    playerNames[m.createdBy] = playerNames[m.createdBy] || m.creatorName || 'Host';
  }

  const innings = Array.isArray(m.innings) && m.innings.length > 0
    ? m.innings
    : (Array.isArray(scorecard.innings) ? scorecard.innings : []);

  let currentInningsIndex = 0;
  if (m.currentInningsIndex !== undefined && m.currentInningsIndex !== null) {
    currentInningsIndex = Number(m.currentInningsIndex);
  } else if (scorecard.currentInning !== undefined && scorecard.currentInning !== null) {
    currentInningsIndex = Number(scorecard.currentInning);
  } else if (scorecard.currentInningsIndex !== undefined && scorecard.currentInningsIndex !== null) {
    currentInningsIndex = Number(scorecard.currentInningsIndex);
  } else if (innings.length > 1) {
    currentInningsIndex = 1;
  }

  const resultText = m.resultText || m.result || scorecard.resultText || scorecard.result || '';
  const overs = m.overs || scorecard.overs || 6;
  const toss = m.toss || scorecard.toss || null;

  return {
    ...m,
    players: playerIds,
    playerNames: { ...playerNames, ...(m.playerNames || {}) },
    scorecard,
    innings,
    currentInningsIndex,
    resultText,
    result: resultText,
    overs,
    toss: toss || m.toss,
  };
}

const matchController = {
  /**
   * POST /api/v1/matches
   * Create match & generate join code
   */
  async createMatch(req, res) {
    const { uid } = req.user;

    try {
      const parsed = createMatchSchema.parse(req.body);
      const joinCode = generateJoinCode();
      const userProfile = await prisma.user.findUnique({ where: { id: uid } });

      const matchId = req.body.id || `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const teams = parsed.teams || req.body.teams || {
        A: { name: 'Team A', playerIds: [], players: [] },
        B: { name: 'Team B', playerIds: [], players: [] },
      };

      const scorecard = parsed.scorecard || req.body.scorecard || {
        innings: [
          { team: 'Team A', runs: 0, wickets: 0, overs: '0.0', balls: [] },
          { team: 'Team B', runs: 0, wickets: 0, overs: '0.0', balls: [] },
        ],
        currentInning: 0,
        striker: '',
        nonStriker: '',
        bowler: '',
      };

      const initialPlayers = Array.isArray(req.body.players)
        ? req.body.players.map((p) => ({ userId: typeof p === 'object' ? (p.id || p.userId) : p })).filter((p) => p.userId)
        : [];

      let validTurfId = null;
      const reqTurfId = parsed.turfId || req.body.turfId;
      if (reqTurfId) {
        try {
          const existingTurf = await prisma.turf.findUnique({ where: { id: reqTurfId }, select: { id: true } });
          if (existingTurf) validTurfId = existingTurf.id;
        } catch (_) {}
      }

      const matchData = {
        id: matchId,
        createdBy: uid,
        creatorName: userProfile?.name || 'Player',
        joinCode,
        place: parsed.place || req.body.place || 'Turf Arena',
        sport: parsed.sport || req.body.sport || 'Cricket',
        matchDate: String(parsed.date || parsed.matchDate || req.body.date || new Date().toISOString().split('T')[0]),
        matchTime: String(parsed.time || parsed.matchTime || req.body.time || '18:00'),
        playWithStrangers: Boolean(parsed.playWithStrangers || req.body.playWithStrangers),
        turfId: validTurfId,
        bookingId: parsed.bookingId || req.body.bookingId || null,
        teams,
        scorecard,
        toss: req.body.toss || null,
        status: req.body.status || 'created',
      };

      if (initialPlayers.length > 0) {
        matchData.players = { create: initialPlayers };
      }

      const match = await prisma.match.create({
        data: matchData,
        include: { players: true, turf: true },
      });

      const userMap = { [uid]: userProfile?.name || 'Player' };
      return sendSuccess(res, { match: formatMatch(match, userMap) }, 201);
    } catch (err) {
      console.error('createMatch error:', err);
      return sendError(res, err.message || 'Failed to create match', 400, 'CREATE_FAILED');
    }
  },

  /**
   * POST /api/v1/matches/join
   * Join existing match using 6-char code
   */
  async joinMatch(req, res) {
    const { uid } = req.user;

    try {
      const { joinCode } = joinMatchSchema.parse(req.body);
      const match = await prisma.match.findUnique({
        where: { joinCode: joinCode.toUpperCase().trim() },
        include: { players: true },
      });

      if (!match) {
        return sendError(res, 'Invalid or expired match join code', 404, 'MATCH_NOT_FOUND');
      }

      const isJoined = (match.players || []).some((p) => p.userId === uid);
      if (!isJoined) {
        await prisma.matchPlayer.create({
          data: {
            matchId: match.id,
            userId: uid,
          },
        });
      }

      const updated = await prisma.match.findUnique({
        where: { id: match.id },
        include: { players: true },
      });

      const playerIds = (updated.players || []).map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, name: true },
      });
      const userMap = {};
      users.forEach((u) => { userMap[u.id] = u.name; });

      return sendSuccess(res, { match: formatMatch(updated, userMap) });
    } catch (err) {
      console.error('joinMatch error:', err);
      return sendError(res, err.message || 'Failed to join match', 400, 'JOIN_FAILED');
    }
  },

  /**
   * POST /api/v1/matches/:id/invite
   * Invite players to match room with FCM notifications
   */
  async invitePlayers(req, res) {
    const { id } = req.params;
    const { playerIds = [] } = req.body;

    try {
      const match = await prisma.match.findUnique({ where: { id } });
      if (!match) {
        return sendError(res, 'Match not found', 404, 'NOT_FOUND');
      }

      if (playerIds.length > 0) {
        await notificationService.sendToUsers(playerIds, {
          title: 'Match Invitation 🏏',
          body: `You have been invited by ${match.creatorName || 'a player'} to join a ${match.sport || 'Cricket'} match at ${match.place || 'the turf'}.`,
          type: 'match',
          data: {
            matchId: id,
            joinCode: match.joinCode || '',
          },
        });
      }

      return sendSuccess(res, {
        message: 'Invitations sent successfully',
        invitedCount: playerIds.length,
      });
    } catch (err) {
      console.error('invitePlayers error:', err);
      return sendError(res, 'Failed to invite players', 500, 'INVITE_FAILED');
    }
  },

  /**
   * GET /api/v1/matches/:id
   */
  async getMatchById(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    try {
      const match = await prisma.match.findUnique({
        where: { id },
        include: { players: true, turf: true },
      });

      if (!match) {
        return sendError(res, 'Match not found', 404, 'NOT_FOUND');
      }

      const playerIds = (match.players || []).map((p) => (typeof p === 'string' ? p : p.userId));
      const isCreator = match.createdBy === uid;
      const isParticipant = playerIds.includes(uid);
      const isPublic = Boolean(match.playWithStrangers);

      if (!isCreator && !isParticipant && !isPublic) {
        return sendError(res, 'Access denied. You are not a participant of this match.', 403, 'FORBIDDEN');
      }

      const userLookupIds = match.createdBy ? [...playerIds, match.createdBy] : playerIds;

      const users = await prisma.user.findMany({
        where: { id: { in: userLookupIds } },
        select: { id: true, name: true },
      });

      const userMap = {};
      users.forEach((u) => {
        userMap[u.id] = u.name;
      });

      return sendSuccess(res, { match: formatMatch(match, userMap) });
    } catch (err) {
      console.error('getMatchById error:', err);
      return sendError(res, 'Failed to fetch match', 500, 'FETCH_FAILED');
    }
  },

  /**
   * PATCH /api/v1/matches/:id/teams
   */
  async updateTeams(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    try {
      const match = await prisma.match.findUnique({
        where: { id },
        include: { players: true },
      });

      if (!match) {
        return sendError(res, 'Match not found', 404, 'NOT_FOUND');
      }

      const playerIds = (match.players || []).map((p) => (typeof p === 'string' ? p : p.userId));
      if (match.createdBy !== uid && !playerIds.includes(uid)) {
        return sendError(res, 'Access denied. You cannot modify teams for this match.', 403, 'FORBIDDEN');
      }

      const parsed = updateTeamsSchema.parse(req.body);
      const updated = await prisma.match.update({
        where: { id },
        data: {
          teams: parsed,
          updatedAt: new Date(),
        },
        include: { players: true },
      });

      const updatedPlayerIds = (updated.players || []).map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: updatedPlayerIds } },
        select: { id: true, name: true },
      });
      const userMap = {};
      users.forEach((u) => { userMap[u.id] = u.name; });

      return sendSuccess(res, { match: formatMatch(updated, userMap) });
    } catch (err) {
      console.error('updateTeams error:', err);
      return sendError(res, 'Failed to update teams', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/matches/:id/toss
   */
  async saveToss(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    try {
      const match = await prisma.match.findUnique({
        where: { id },
        include: { players: true },
      });

      if (!match) {
        return sendError(res, 'Match not found', 404, 'NOT_FOUND');
      }

      const playerIds = (match.players || []).map((p) => (typeof p === 'string' ? p : p.userId));
      if (match.createdBy !== uid && !playerIds.includes(uid)) {
        return sendError(res, 'Access denied. You cannot modify toss for this match.', 403, 'FORBIDDEN');
      }

      const parsed = tossSchema.parse(req.body);
      const updated = await prisma.match.update({
        where: { id },
        data: {
          toss: parsed,
          status: 'live',
          updatedAt: new Date(),
        },
        include: { players: true },
      });

      const updatedPlayerIds = (updated.players || []).map((p) => p.userId);
      const users = await prisma.user.findMany({
        where: { id: { in: updatedPlayerIds } },
        select: { id: true, name: true },
      });
      const userMap = {};
      users.forEach((u) => { userMap[u.id] = u.name; });

      return sendSuccess(res, { match: formatMatch(updated, userMap) });
    } catch (err) {
      console.error('saveToss error:', err);
      return sendError(res, 'Failed to save toss', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/matches/:id/scorecard
   * Live ball-by-ball score update & match completion
   */
  async updateScorecard(req, res) {
    const { id } = req.params;
    const { uid } = req.user;

    try {
      const existingMatch = await prisma.match.findUnique({
        where: { id },
        include: { players: true },
      });

      if (existingMatch) {
        const playerIds = (existingMatch.players || []).map((p) => (typeof p === 'string' ? p : p.userId));
        if (existingMatch.createdBy !== uid && !playerIds.includes(uid)) {
          return sendError(res, 'Access denied. You cannot update the scorecard for this match.', 403, 'FORBIDDEN');
        }
      }

      const updatePayload = {
        updatedAt: new Date(),
      };

      if (req.body.scorecard !== undefined) {
        updatePayload.scorecard = req.body.scorecard;
      } else if (req.body.innings || req.body.football || req.body.badminton || req.body.volleyball || req.body.basketball || req.body.tennis) {
        updatePayload.scorecard = req.body;
      }

      if (req.body.teams !== undefined) {
        updatePayload.teams = req.body.teams;
      }
      if (req.body.toss !== undefined) {
        updatePayload.toss = req.body.toss;
      }

      if (req.body.status && ['created', 'live', 'completed'].includes(req.body.status)) {
        updatePayload.status = req.body.status;
      }

      let updated;
      try {
        updated = await prisma.match.update({
          where: { id },
          data: updatePayload,
          include: { players: true, turf: true },
        });
      } catch (updateErr) {
        const createdBy = uid || 'guest_user';
        const sport = req.body.sport || 'Cricket';
        const place = req.body.place || 'Turf Arena';
        const joinCode = req.body.joinCode || id.slice(-6).toUpperCase();

        updated = await prisma.match.create({
          data: {
            id,
            createdBy,
            creatorName: req.body.creatorName || 'Player',
            joinCode,
            place,
            sport,
            teams: updatePayload.teams || req.body.teams || {},
            scorecard: updatePayload.scorecard || {},
            toss: updatePayload.toss || {},
            status: updatePayload.status || 'live',
            players: { create: [{ userId: createdBy }] },
          },
          include: { players: true, turf: true },
        });
      }

      const playerIds = (updated.players || []).map((p) => (typeof p === 'string' ? p : p.userId));
      if (updated.createdBy) playerIds.push(updated.createdBy);

      const users = await prisma.user.findMany({
        where: { id: { in: playerIds } },
        select: { id: true, name: true },
      });

      const userMap = {};
      users.forEach((u) => {
        userMap[u.id] = u.name;
      });

      return sendSuccess(res, { match: formatMatch(updated, userMap) });
    } catch (err) {
      console.error('updateScorecard error:', err);
      return sendError(res, 'Failed to update scorecard', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * GET /api/v1/matches/mine
   * User's matches
   */
  async getMyMatches(req, res) {
    const { uid } = req.user;
    const { limit = 100, status } = req.query;

    try {
      const whereClause = {
        OR: [
          { createdBy: uid },
          { players: { some: { userId: uid } } },
        ],
      };

      if (status && ['created', 'live', 'completed'].includes(status)) {
        whereClause.status = status;
      }

      const rawMatches = await prisma.match.findMany({
        where: whereClause,
        include: { players: true, turf: true },
        orderBy: { createdAt: 'desc' },
        take: Number(limit),
      });

      const allUserIds = new Set();
      rawMatches.forEach((m) => {
        if (m.createdBy) allUserIds.add(m.createdBy);
        (m.players || []).forEach((p) => {
          if (p.userId) allUserIds.add(p.userId);
        });
      });

      const users = await prisma.user.findMany({
        where: { id: { in: Array.from(allUserIds) } },
        select: { id: true, name: true },
      });

      const userMap = {};
      users.forEach((u) => {
        userMap[u.id] = u.name;
      });

      const matches = rawMatches.map((m) => formatMatch(m, userMap)).filter(Boolean);

      return sendSuccess(res, { matches, count: matches.length });
    } catch (err) {
      console.error('getMyMatches error:', err);
      return sendError(res, 'Failed to fetch user matches', 500, 'FETCH_FAILED');
    }
  },
};

module.exports = matchController;
