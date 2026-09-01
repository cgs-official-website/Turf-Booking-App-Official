const crypto = require('crypto');
const firestoreService = require('../services/firestoreService');
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

const matchController = {
  /**
   * POST /api/v1/matches
   * Create match & generate join code
   */
  async createMatch(req, res) {
    const { uid } = req.user;
    const parsed = createMatchSchema.parse(req.body);

    const joinCode = generateJoinCode();
    const userProfile = await firestoreService.getDoc('users', uid);

    const matchData = {
      ...parsed,
      createdBy: uid,
      creatorName: userProfile?.name || 'Player',
      joinCode,
      players: [uid],
      playerProfiles: [{ uid, name: userProfile?.name || 'Player', photoURL: userProfile?.photoURL || '' }],
      teams: {
        teamA: { name: 'Team A', players: [userProfile?.name || 'Player'] },
        teamB: { name: 'Team B', players: [] },
      },
      toss: null,
      status: 'created',
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
    };

    const match = await firestoreService.createDoc('matches', matchData);
    return sendSuccess(res, { match }, 201);
  },

  /**
   * POST /api/v1/matches/join
   * Join existing match using 6-char code
   */
  async joinMatch(req, res) {
    const { uid } = req.user;
    const { joinCode } = joinMatchSchema.parse(req.body);

    const result = await firestoreService.queryWithCursor('matches', {
      filters: [['joinCode', '==', joinCode.toUpperCase().trim()]],
      limit: 1,
    });

    if (result.items.length === 0) {
      return sendError(res, 'Invalid or expired match join code', 404, 'MATCH_NOT_FOUND');
    }

    const match = result.items[0];
    const userProfile = await firestoreService.getDoc('users', uid);

    const players = match.players || [];
    const playerProfiles = match.playerProfiles || [];

    if (!players.includes(uid)) {
      players.push(uid);
      playerProfiles.push({
        uid,
        name: userProfile?.name || 'Player',
        photoURL: userProfile?.photoURL || '',
      });

      await firestoreService.updateDoc('matches', match.id, {
        players,
        playerProfiles,
      });
    }

    return sendSuccess(res, { match: { ...match, players, playerProfiles } });
  },

  /**
   * GET /api/v1/matches/:id
   */
  async getMatchById(req, res) {
    const { id } = req.params;
    const match = await firestoreService.getDoc('matches', id);
    if (!match) {
      return sendError(res, 'Match not found', 404, 'NOT_FOUND');
    }
    return sendSuccess(res, { match });
  },

  /**
   * PATCH /api/v1/matches/:id/teams
   */
  async updateTeams(req, res) {
    const { id } = req.params;
    const parsed = updateTeamsSchema.parse(req.body);

    const updated = await firestoreService.updateDoc('matches', id, {
      teams: parsed,
    });

    return sendSuccess(res, { match: updated });
  },

  /**
   * PATCH /api/v1/matches/:id/toss
   */
  async saveToss(req, res) {
    const { id } = req.params;
    const parsed = tossSchema.parse(req.body);

    const updated = await firestoreService.updateDoc('matches', id, {
      toss: parsed,
      status: 'live',
    });

    return sendSuccess(res, { match: updated });
  },

  /**
   * PATCH /api/v1/matches/:id/scorecard
   * Live ball-by-ball score update
   */
  async updateScorecard(req, res) {
    const { id } = req.params;
    const parsed = updateScorecardSchema.parse(req.body);

    const updatePayload = {
      scorecard: parsed.scorecard,
    };
    if (parsed.status) {
      updatePayload.status = parsed.status;
    }

    const updated = await firestoreService.updateDoc('matches', id, updatePayload);
    return sendSuccess(res, { match: updated });
  },

  /**
   * GET /api/v1/matches/mine
   * User's matches
   */
  async getMyMatches(req, res) {
    const { uid } = req.user;
    const { limit = 20, cursor } = req.query;

    const result = await firestoreService.queryWithCursor('matches', {
      filters: [['players', 'array-contains', uid]],
      orderByField: 'createdAt',
      orderDirection: 'desc',
      limit: Number(limit),
      cursor,
    });

    return sendPaginated(res, result.items, result.nextCursor, { count: result.items.length });
  },
};

module.exports = matchController;
