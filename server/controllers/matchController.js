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

function formatMatch(m) {
  if (!m) return null;
  const playerIds = (m.players || []).map((p) => (typeof p === 'string' ? p : p.userId));
  return {
    ...m,
    players: playerIds,
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

      const matchId = `match_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const teams = parsed.teams || {
        teamA: { name: 'Team A', players: [userProfile?.name || 'Player'] },
        teamB: { name: 'Team B', players: [] },
      };

      const match = await prisma.match.create({
        data: {
          id: matchId,
          createdBy: uid,
          creatorName: userProfile?.name || 'Player',
          joinCode,
          place: parsed.place || 'Turf Arena',
          sport: parsed.sport || 'Cricket',
          matchDate: String(parsed.matchDate || new Date().toISOString().split('T')[0]),
          matchTime: String(parsed.matchTime || '18:00'),
          playWithStrangers: Boolean(parsed.playWithStrangers),
          turfId: parsed.turfId || null,
          bookingId: parsed.bookingId || null,
          teams,
          scorecard: {
            innings: [
              { team: 'Team A', runs: 0, wickets: 0, overs: '0.0', balls: [] },
              { team: 'Team B', runs: 0, wickets: 0, overs: '0.0', balls: [] },
            ],
            currentInning: 0,
            striker: '',
            nonStriker: '',
            bowler: '',
          },
          status: 'created',
          players: {
            create: [{ userId: uid }],
          },
        },
        include: { players: true, turf: true },
      });

      return sendSuccess(res, { match: formatMatch(match) }, 201);
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

      return sendSuccess(res, { match: formatMatch(updated) });
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

    try {
      const match = await prisma.match.findUnique({
        where: { id },
        include: { players: true, turf: true },
      });

      if (!match) {
        return sendError(res, 'Match not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, { match: formatMatch(match) });
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

    try {
      const parsed = updateTeamsSchema.parse(req.body);
      const updated = await prisma.match.update({
        where: { id },
        data: {
          teams: parsed,
          updatedAt: new Date(),
        },
        include: { players: true },
      });

      return sendSuccess(res, { match: formatMatch(updated) });
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

    try {
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

      return sendSuccess(res, { match: formatMatch(updated) });
    } catch (err) {
      console.error('saveToss error:', err);
      return sendError(res, 'Failed to save toss', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/matches/:id/scorecard
   * Live ball-by-ball score update
   */
  async updateScorecard(req, res) {
    const { id } = req.params;

    try {
      const parsed = updateScorecardSchema.parse(req.body);
      const updatePayload = {
        scorecard: parsed.scorecard,
        updatedAt: new Date(),
      };
      if (parsed.status) {
        updatePayload.status = parsed.status;
      }

      const updated = await prisma.match.update({
        where: { id },
        data: updatePayload,
        include: { players: true },
      });

      return sendSuccess(res, { match: formatMatch(updated) });
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
    const { limit = 20 } = req.query;

    try {
      const playerRecords = await prisma.matchPlayer.findMany({
        where: { userId: uid },
        include: {
          match: {
            include: { players: true, turf: true },
          },
        },
        orderBy: { joinedAt: 'desc' },
        take: Number(limit),
      });

      const matches = playerRecords
        .map((pr) => formatMatch(pr.match))
        .filter(Boolean);

      return sendPaginated(res, matches, null, { count: matches.length });
    } catch (err) {
      console.error('getMyMatches error:', err);
      return sendError(res, 'Failed to fetch user matches', 500, 'FETCH_FAILED');
    }
  },
};

module.exports = matchController;
