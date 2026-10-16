const crypto = require('crypto');
const prisma = require('../config/prisma');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');

const VALID_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
const VALID_FORMATS = ['knockout', 'round_robin', 'group_knockout', 'double_elimination', 'league'];

function validateDateStrings(start, end) {
  if (!start || !end) return false;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return !isNaN(s) && !isNaN(e) && s <= e;
}

/**
 * Generate a clean, unique shareable identifier for the tournament
 * Format: trnt_<timestamp>_<randomHex>
 */
function generateShareableIdentifier() {
  const randomHex = crypto.randomBytes(6).toString('hex');
  const timestamp = Date.now().toString(36);
  return `trnt_${timestamp}_${randomHex}`;
}

/**
 * Format tournament data for client responses
 */
function formatTournament(t, reqUser = null) {
  if (!t) return null;
  const shareId = t.shareableIdentifier || t.shareable_identifier;
  const turfId = t.turfId || t.turf_id;
  const userId = t.userId || t.user_id || null;
  const vendorId = t.vendorId || t.vendor_id || null;
  const creatorType = t.creatorType || t.creator_type || (userId ? 'USER' : 'VENDOR');
  const isCommunity = creatorType === 'USER' || Boolean(userId);

  const currentUserId = reqUser ? reqUser.id || reqUser.uid : null;
  const isOwner = Boolean(
    currentUserId &&
    (currentUserId === userId || currentUserId === vendorId)
  );

  return {
    id: t.id,
    creatorType,
    source: isCommunity ? 'COMMUNITY' : 'TURF HOSTED',
    sourceLabel: isCommunity ? 'COMMUNITY / MY TOURNAMENT' : 'TURF HOSTED',
    turfId,
    turfName: t.turf?.name || t.venueName || undefined,
    turf: t.turf
      ? {
          id: t.turf.id,
          name: t.turf.name,
          city: t.turf.city,
          address: t.turf.location?.address || t.turf.city || '',
          images: t.turf.images || [],
          logo: t.turf.logo || null,
        }
      : undefined,
    vendorId,
    userId,
    user: t.user
      ? {
          id: t.user.id,
          name: t.user.name,
          avatar: t.user.avatar || null,
        }
      : undefined,
    creatorName: t.user?.name || (isCommunity ? 'Community Member' : (t.turf?.name || t.venueName || 'Turf Host')),
    name: t.name,
    sport: t.sport,
    category: t.sport,
    startDate: t.startDate,
    endDate: t.endDate,
    numberOfTeams: t.numberOfTeams !== null && t.numberOfTeams !== undefined ? Number(t.numberOfTeams) : null,
    playersPerTeam: t.playersPerTeam !== null && t.playersPerTeam !== undefined ? Number(t.playersPerTeam) : null,
    oversPerTeam: t.oversPerTeam !== null && t.oversPerTeam !== undefined ? Number(t.oversPerTeam) : null,
    status: t.status,
    description: t.description || '',
    rules: t.rules || '',
    bannerUrl: t.bannerUrl || null,
    venueName: t.venueName || t.turf?.name || null,
    city: t.city || t.turf?.city || null,
    venueLocation: t.venueLocation || t.turf?.location || null,
    registrationStartDate: t.registrationStartDate || null,
    registrationEndDate: t.registrationEndDate || null,
    entryFee: t.entryFee !== undefined && t.entryFee !== null ? Number(t.entryFee) : 0,
    prizePool: t.prizePool !== undefined && t.prizePool !== null ? Number(t.prizePool) : 0,
    prizeDetails: t.prizeDetails || null,
    participantCapacity: t.participantCapacity || 16,
    format: t.format || 'knockout',
    currentParticipantsCount: t.currentParticipantsCount || 0,
    contactPhone: t.contactPhone || null,
    contactEmail: t.contactEmail || null,
    createdBy: t.createdBy || null,
    shareableIdentifier: shareId,
    shareableUrl: shareId
      ? `https://turfbookingapp.com/tournament/${shareId}${turfId ? `?turfId=${turfId}` : ''}`
      : null,
    isOwner,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

const tournamentController = {
  formatTournament,

  /**
   * GET /api/v1/admin/tournaments
   * Retrieve list of tournaments with filtering, search, and KPI aggregation (Super Admin)
   */
  async getAllTournaments(req, res) {
    try {
      const { status, sport, search, turfId } = req.query;

      const where = {};
      if (status && status !== 'all') {
        where.status = String(status).toLowerCase();
      }
      if (sport && sport !== 'all') {
        where.sport = { equals: String(sport).trim(), mode: 'insensitive' };
      }
      if (turfId) {
        where.turfId = String(turfId).trim();
      }

      let tournaments = await prisma.tournament.findMany({
        where,
        include: {
          turf: {
            select: {
              id: true,
              name: true,
              city: true,
              location: true,
              images: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
        orderBy: [{ createdAt: 'desc' }],
      });

      // Filter in memory for search query
      if (search && search.trim()) {
        const q = search.trim().toLowerCase();
        tournaments = tournaments.filter((t) => {
          return (
            (t.name && t.name.toLowerCase().includes(q)) ||
            (t.sport && t.sport.toLowerCase().includes(q)) ||
            (t.venueName && t.venueName.toLowerCase().includes(q)) ||
            (t.city && t.city.toLowerCase().includes(q)) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.turf?.name && t.turf.name.toLowerCase().includes(q))
          );
        });
      }

      // Aggregate status counts for quick KPI cards
      const allTournaments = await prisma.tournament.findMany({
        select: { status: true },
      });

      const stats = {
        total: allTournaments.length,
        draft: allTournaments.filter((t) => t.status === 'draft').length,
        published: allTournaments.filter((t) => t.status === 'published').length,
        ongoing: allTournaments.filter((t) => t.status === 'ongoing').length,
        completed: allTournaments.filter((t) => t.status === 'completed').length,
        cancelled: allTournaments.filter((t) => t.status === 'cancelled').length,
      };

      return sendSuccess(res, {
        tournaments: tournaments.map((t) => formatTournament(t, req.user)),
        total: tournaments.length,
        stats,
      });
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      return sendError(res, err.message || 'Failed to fetch tournaments', 500, 'FETCH_TOURNAMENTS_FAILED');
    }
  },

  /**
   * GET /api/v1/tournaments/available
   * Public list of currently active, published turf-owner tournaments for UserApp
   */
  async getAvailableTournaments(req, res) {
    try {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;

      const tournaments = await prisma.tournament.findMany({
        where: {
          creatorType: 'VENDOR',
          status: 'published',
          endDate: {
            gte: todayStr,
          },
        },
        include: {
          turf: {
            select: {
              id: true,
              name: true,
              city: true,
              location: true,
              images: true,
              logo: true,
              sports: true,
              pricePerHour: true,
            },
          },
        },
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
      });

      const formatted = tournaments.map((t) => formatTournament(t, req.user));

      return sendSuccess(res, {
        tournaments: formatted,
        count: formatted.length,
      });
    } catch (err) {
      console.error('getAvailableTournaments error:', err);
      return sendError(res, 'Failed to fetch available tournaments', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/tournaments/my
   * Retrieve tournaments created by the current authenticated user (UserApp)
   */
  async getMyTournaments(req, res) {
    try {
      const userId = req.user?.id || req.user?.uid;
      if (!userId) {
        return sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      }

      const tournaments = await prisma.tournament.findMany({
        where: {
          creatorType: 'USER',
          userId,
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = tournaments.map((t) => formatTournament(t, req.user));

      return sendSuccess(res, {
        tournaments: formatted,
        count: formatted.length,
      });
    } catch (err) {
      console.error('getMyTournaments error:', err);
      return sendError(res, 'Failed to fetch your tournaments', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/tournaments
   * Vendor retrieves tournaments for their turf(s)
   */
  async getVendorTournaments(req, res) {
    try {
      const vendorId = req.vendor?.id || req.user?.id || req.user?.uid;
      const { turfId } = req.query;

      if (!vendorId) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      const where = {
        vendorId,
        creatorType: 'VENDOR',
      };
      if (turfId) {
        where.turfId = turfId;
      }

      const tournaments = await prisma.tournament.findMany({
        where,
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = tournaments.map((t) => formatTournament(t, req.user));

      return sendSuccess(res, {
        tournaments: formatted,
        count: formatted.length,
      });
    } catch (err) {
      console.error('getVendorTournaments error:', err);
      return sendError(res, 'Failed to fetch tournaments', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/tournaments/:id
   * GET /api/v1/admin/tournaments/:id
   * Retrieve single tournament detail
   */
  async getTournamentById(req, res) {
    try {
      const id = req.params?.id || req.params?.tournamentId;
      if (!id) {
        return sendError(res, 'Tournament ID is required', 400, 'MISSING_ID');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          turf: {
            select: {
              id: true,
              name: true,
              city: true,
              images: true,
              logo: true,
              location: true,
              sports: true,
              pricePerHour: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
        },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const formatted = formatTournament(tournament, req.user);
      return sendSuccess(res, { tournament: formatted });
    } catch (err) {
      console.error('getTournamentById error:', err);
      return sendError(res, 'Failed to fetch tournament detail', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/tournaments
   * User creates a tournament (UserApp)
   */
  async createUserTournament(req, res) {
    try {
      const userId = req.user?.id || req.user?.uid;
      if (!userId) {
        return sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      }

      const {
        name,
        sport,
        category,
        startDate,
        endDate,
        numberOfTeams,
        playersPerTeam,
        oversPerTeam,
        description,
        rules,
        bannerUrl,
        publishNow,
      } = req.body;

      const effectiveSport = (sport || category || '').trim();
      const errors = {};

      if (!name || !name.trim() || name.trim().length < 3) {
        errors.name = 'Tournament name is required (minimum 3 characters)';
      }
      if (!effectiveSport) {
        errors.sport = 'Sport category is required';
      }
      if (!startDate) {
        errors.startDate = 'Start date is required';
      }
      if (!endDate) {
        errors.endDate = 'End date is required';
      }
      if (startDate && endDate && endDate < startDate) {
        errors.dateRange = 'End date cannot be earlier than start date';
      }

      const teamsCount = parseInt(numberOfTeams, 10);
      if (isNaN(teamsCount) || teamsCount < 2) {
        errors.numberOfTeams = 'Number of teams must be at least 2';
      }

      const playersCount = parseInt(playersPerTeam, 10);
      if (isNaN(playersCount) || playersCount < 1) {
        errors.playersPerTeam = 'Players per team must be at least 1';
      }

      const isCricket = effectiveSport.toLowerCase().includes('cricket');
      let parsedOvers = null;
      if (isCricket) {
        parsedOvers = parseInt(oversPerTeam, 10);
        if (isNaN(parsedOvers) || parsedOvers < 1) {
          errors.oversPerTeam = 'Overs per team must be greater than 0 for Cricket';
        }
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      const shareableIdentifier = generateShareableIdentifier();
      const initialStatus = publishNow ? 'published' : 'draft';

      const tournament = await prisma.tournament.create({
        data: {
          creatorType: 'USER',
          userId,
          name: name.trim(),
          sport: effectiveSport,
          startDate: String(startDate).slice(0, 32),
          endDate: String(endDate).slice(0, 32),
          numberOfTeams: teamsCount,
          playersPerTeam: playersCount,
          oversPerTeam: parsedOvers,
          description: description ? description.trim() : null,
          rules: rules ? rules.trim() : null,
          bannerUrl: bannerUrl ? bannerUrl.trim() : null,
          status: initialStatus,
          shareableIdentifier,
        },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      const formatted = formatTournament(tournament, req.user);

      return sendSuccess(res, {
        tournament: formatted,
        shareableUrl: formatted.shareableUrl,
        message: publishNow ? 'Tournament published successfully!' : 'Tournament saved as draft',
      }, 201);
    } catch (err) {
      console.error('createUserTournament error:', err);
      return sendError(res, 'Failed to create tournament', 500, 'CREATE_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/tournaments
   * Vendor creates a tournament (VendorApp)
   */
  async createVendorTournament(req, res) {
    try {
      const vendorId = req.vendor?.id || req.user?.id || req.user?.uid;
      if (!vendorId) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      const {
        turfId,
        name,
        sport,
        category,
        startDate,
        endDate,
        numberOfTeams,
        playersPerTeam,
        oversPerTeam,
        description,
        rules,
        bannerUrl,
      } = req.body;

      const effectiveSport = (sport || category || '').trim();
      const errors = {};

      if (!turfId) {
        errors.turfId = 'Turf facility is required';
      }
      if (!name || !name.trim() || name.trim().length < 3) {
        errors.name = 'Tournament name is required (minimum 3 characters)';
      }
      if (!effectiveSport) {
        errors.sport = 'Sport category is required';
      }
      if (!startDate) {
        errors.startDate = 'Start date is required';
      }
      if (!endDate) {
        errors.endDate = 'End date is required';
      }
      if (startDate && endDate && endDate < startDate) {
        errors.dateRange = 'End date cannot be earlier than start date';
      }

      const teamsCount = parseInt(numberOfTeams, 10);
      if (isNaN(teamsCount) || teamsCount < 2) {
        errors.numberOfTeams = 'Number of teams must be at least 2';
      }

      const playersCount = parseInt(playersPerTeam, 10);
      if (isNaN(playersCount) || playersCount < 1) {
        errors.playersPerTeam = 'Players per team must be at least 1';
      }

      const isCricket = effectiveSport.toLowerCase().includes('cricket');
      let parsedOvers = null;
      if (isCricket) {
        parsedOvers = parseInt(oversPerTeam, 10);
        if (isNaN(parsedOvers) || parsedOvers < 1) {
          errors.oversPerTeam = 'Overs per team must be greater than 0 for Cricket';
        }
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      // Verify turf ownership
      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
        select: { id: true, vendorId: true, name: true, city: true, images: true, logo: true, location: true },
      });

      if (!turf || turf.vendorId !== vendorId) {
        return sendError(res, 'Invalid turf selected or access denied', 403, 'FORBIDDEN');
      }

      const shareableIdentifier = generateShareableIdentifier();

      const tournament = await prisma.tournament.create({
        data: {
          creatorType: 'VENDOR',
          turfId,
          vendorId,
          name: name.trim(),
          sport: effectiveSport,
          venueName: turf.name,
          city: turf.city,
          startDate: String(startDate).slice(0, 32),
          endDate: String(endDate).slice(0, 32),
          numberOfTeams: teamsCount,
          playersPerTeam: playersCount,
          oversPerTeam: parsedOvers,
          description: description ? description.trim() : null,
          rules: rules ? rules.trim() : null,
          bannerUrl: bannerUrl ? bannerUrl.trim() : null,
          status: 'draft',
          shareableIdentifier,
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true },
          },
        },
      });

      const formatted = formatTournament(tournament, req.user);

      return sendSuccess(res, {
        tournament: formatted,
        shareableUrl: formatted.shareableUrl,
      }, 201);
    } catch (err) {
      console.error('createVendorTournament error:', err);
      return sendError(res, 'Failed to create tournament', 500, 'CREATE_FAILED');
    }
  },

  /**
   * POST /api/v1/admin/tournaments
   * Super Admin creates a tournament directly
   */
  async createTournament(req, res) {
    try {
      const {
        name,
        description,
        sport,
        turfId,
        venueName,
        city,
        venueLocation,
        startDate,
        endDate,
        registrationStartDate,
        registrationEndDate,
        entryFee,
        prizePool,
        prizeDetails,
        participantCapacity,
        format,
        rules,
        bannerUrl,
        status,
        contactPhone,
        contactEmail,
      } = req.body;

      const errors = {};
      if (!name || !name.trim()) errors.name = 'Tournament name is required';
      if (!sport || !sport.trim()) errors.sport = 'Sport type is required';
      if (!startDate) errors.startDate = 'Start date is required';
      if (!endDate) errors.endDate = 'End date is required';

      if (startDate && endDate && !validateDateStrings(startDate, endDate)) {
        errors.dateRange = 'Tournament end date must be on or after start date';
      }
      if (registrationStartDate && registrationEndDate && !validateDateStrings(registrationStartDate, registrationEndDate)) {
        errors.regDateRange = 'Registration end date must be on or after registration start date';
      }
      if (registrationEndDate && startDate) {
        const regEnd = new Date(registrationEndDate).getTime();
        const tStart = new Date(startDate).getTime();
        if (regEnd > tStart) {
          errors.regDeadline = 'Registration deadline cannot be after tournament start date';
        }
      }

      if (entryFee !== undefined && (isNaN(Number(entryFee)) || Number(entryFee) < 0)) {
        errors.entryFee = 'Entry fee must be a valid non-negative number';
      }
      if (prizePool !== undefined && (isNaN(Number(prizePool)) || Number(prizePool) < 0)) {
        errors.prizePool = 'Prize pool must be a valid non-negative number';
      }
      if (participantCapacity !== undefined && (isNaN(parseInt(participantCapacity, 10)) || parseInt(participantCapacity, 10) < 2)) {
        errors.participantCapacity = 'Participant capacity must be at least 2';
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      let resolvedVendorId = null;
      let resolvedVenue = venueName ? venueName.trim() : null;
      let resolvedCity = city ? city.trim() : null;

      if (turfId) {
        const turf = await prisma.turf.findUnique({
          where: { id: turfId },
          select: { id: true, name: true, city: true, vendorId: true },
        });
        if (turf) {
          resolvedVendorId = turf.vendorId;
          if (!resolvedVenue) resolvedVenue = turf.name;
          if (!resolvedCity) resolvedCity = turf.city;
        }
      }

      const shareableIdentifier = generateShareableIdentifier();

      const newTournament = await prisma.tournament.create({
        data: {
          creatorType: 'VENDOR',
          name: name.trim(),
          description: description ? description.trim() : null,
          sport: sport.trim(),
          turfId: turfId || null,
          vendorId: resolvedVendorId,
          venueName: resolvedVenue || 'TBD',
          city: resolvedCity,
          venueLocation: venueLocation || null,
          startDate: String(startDate).slice(0, 32),
          endDate: String(endDate).slice(0, 32),
          registrationStartDate: registrationStartDate ? String(registrationStartDate).slice(0, 32) : null,
          registrationEndDate: registrationEndDate ? String(registrationEndDate).slice(0, 32) : null,
          entryFee: entryFee !== undefined ? Number(entryFee) : 0,
          prizePool: prizePool !== undefined ? Number(prizePool) : 0,
          prizeDetails: prizeDetails || null,
          participantCapacity: participantCapacity ? parseInt(participantCapacity, 10) : 16,
          format: format ? String(format).trim().toLowerCase() : 'knockout',
          rules: rules ? rules.trim() : null,
          bannerUrl: bannerUrl ? bannerUrl.trim() : null,
          status: status && VALID_STATUSES.includes(status.toLowerCase()) ? status.toLowerCase() : 'draft',
          contactPhone: contactPhone ? contactPhone.trim() : null,
          contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : null,
          createdBy: req.user?.id || req.user?.uid || 'superadmin',
          shareableIdentifier,
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true },
          },
        },
      });

      return sendSuccess(res, { tournament: formatTournament(newTournament, req.user) }, 201);
    } catch (err) {
      console.error('Error creating admin tournament:', err);
      return sendError(res, err.message || 'Failed to create tournament', 500, 'CREATE_TOURNAMENT_FAILED');
    }
  },

  /**
   * PUT /api/v1/tournaments/:id
   * PUT /api/v1/admin/tournaments/:id
   * PUT /api/v1/vendor/tournaments/:id
   * Update tournament with ownership or admin enforcement
   */
  async updateTournament(req, res) {
    try {
      const id = req.params?.id || req.params?.tournamentId;
      const currentUserId = req.user?.id || req.user?.uid || req.vendor?.id;

      const existing = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!existing) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      const isOwner = Boolean(
        currentUserId &&
        ((existing.userId && existing.userId === currentUserId) ||
         (existing.vendorId && existing.vendorId === currentUserId))
      );

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Access denied: You cannot modify this tournament', 403, 'FORBIDDEN');
      }

      const {
        name,
        sport,
        category,
        description,
        turfId,
        venueName,
        city,
        venueLocation,
        startDate,
        endDate,
        registrationStartDate,
        registrationEndDate,
        entryFee,
        prizePool,
        prizeDetails,
        participantCapacity,
        format,
        rules,
        bannerUrl,
        status,
        contactPhone,
        contactEmail,
        numberOfTeams,
        playersPerTeam,
        oversPerTeam,
      } = req.body;

      const errors = {};
      if (name !== undefined && !name.trim()) errors.name = 'Tournament name cannot be empty';

      const sDate = startDate !== undefined ? startDate : existing.startDate;
      const eDate = endDate !== undefined ? endDate : existing.endDate;
      if (sDate && eDate && eDate < sDate) {
        errors.dateRange = 'End date cannot be earlier than start date';
      }

      if (numberOfTeams !== undefined) {
        const tCount = parseInt(numberOfTeams, 10);
        if (isNaN(tCount) || tCount < 2) errors.numberOfTeams = 'Number of teams must be at least 2';
      }

      if (playersPerTeam !== undefined) {
        const pCount = parseInt(playersPerTeam, 10);
        if (isNaN(pCount) || pCount < 1) errors.playersPerTeam = 'Players per team must be at least 1';
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (sport !== undefined || category !== undefined) updateData.sport = (sport || category).trim();
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (rules !== undefined) updateData.rules = rules ? rules.trim() : null;
      if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl ? bannerUrl.trim() : null;
      if (startDate !== undefined) updateData.startDate = String(startDate).slice(0, 32);
      if (endDate !== undefined) updateData.endDate = String(endDate).slice(0, 32);
      if (numberOfTeams !== undefined) updateData.numberOfTeams = parseInt(numberOfTeams, 10);
      if (playersPerTeam !== undefined) updateData.playersPerTeam = parseInt(playersPerTeam, 10);
      if (oversPerTeam !== undefined) updateData.oversPerTeam = oversPerTeam ? parseInt(oversPerTeam, 10) : null;

      // Admin or facility fields
      if (turfId !== undefined) updateData.turfId = turfId || null;
      if (venueName !== undefined) updateData.venueName = venueName ? venueName.trim() : existing.venueName;
      if (city !== undefined) updateData.city = city ? city.trim() : null;
      if (venueLocation !== undefined) updateData.venueLocation = venueLocation || null;
      if (registrationStartDate !== undefined) updateData.registrationStartDate = String(registrationStartDate).slice(0, 32);
      if (registrationEndDate !== undefined) updateData.registrationEndDate = String(registrationEndDate).slice(0, 32);
      if (entryFee !== undefined) updateData.entryFee = Number(entryFee);
      if (prizePool !== undefined) updateData.prizePool = prizePool !== '' ? Number(prizePool) : 0;
      if (prizeDetails !== undefined) updateData.prizeDetails = prizeDetails || null;
      if (participantCapacity !== undefined) updateData.participantCapacity = parseInt(participantCapacity, 10);
      if (format !== undefined) updateData.format = String(format).trim().toLowerCase();
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone ? contactPhone.trim() : null;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;

      if (status !== undefined && (isAdmin || VALID_STATUSES.includes(status.toLowerCase()))) {
        updateData.status = status.toLowerCase();
      }

      const updated = await prisma.tournament.update({
        where: { id },
        data: updateData,
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true },
          },
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      return sendSuccess(res, { tournament: formatTournament(updated, req.user) });
    } catch (err) {
      console.error('Error updating tournament:', err);
      return sendError(res, err.message || 'Failed to update tournament', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * POST /api/v1/tournaments/:id/publish
   * POST /api/v1/vendor/tournaments/:id/publish
   * Publish tournament and generate/confirm unique shareable link
   */
  async publishTournament(req, res) {
    try {
      const id = req.params?.id || req.params?.tournamentId;
      const currentUserId = req.user?.id || req.user?.uid || req.vendor?.id;

      if (!currentUserId) {
        return sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      }

      const existing = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!existing) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      const isOwner = Boolean(
        (existing.userId && existing.userId === currentUserId) ||
        (existing.vendorId && existing.vendorId === currentUserId)
      );

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Access denied: You cannot publish this tournament', 403, 'FORBIDDEN');
      }

      const shareableIdentifier = existing.shareableIdentifier || generateShareableIdentifier();

      const published = await prisma.tournament.update({
        where: { id },
        data: {
          status: 'published',
          shareableIdentifier,
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true },
          },
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      const formatted = formatTournament(published, req.user);

      return sendSuccess(res, {
        tournament: formatted,
        shareableUrl: formatted.shareableUrl,
        shareableIdentifier: formatted.shareableIdentifier,
      });
    } catch (err) {
      console.error('publishTournament error:', err);
      return sendError(res, 'Failed to publish tournament', 500, 'PUBLISH_FAILED');
    }
  },

  /**
   * POST /api/v1/tournaments/:id/cancel
   * POST /api/v1/vendor/tournaments/:id/cancel
   * Cancel tournament
   */
  async cancelTournament(req, res) {
    try {
      const id = req.params?.id || req.params?.tournamentId;
      const currentUserId = req.user?.id || req.user?.uid || req.vendor?.id;

      if (!currentUserId) {
        return sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      }

      const existing = await prisma.tournament.findUnique({ where: { id } });
      if (!existing) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      const isOwner = Boolean(
        (existing.userId && existing.userId === currentUserId) ||
        (existing.vendorId && existing.vendorId === currentUserId)
      );

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Access denied: You cannot cancel this tournament', 403, 'FORBIDDEN');
      }

      const updated = await prisma.tournament.update({
        where: { id },
        data: { status: 'cancelled' },
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true },
          },
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      return sendSuccess(res, {
        tournament: formatTournament(updated, req.user),
        message: 'Tournament cancelled successfully',
      });
    } catch (err) {
      console.error('cancelTournament error:', err);
      return sendError(res, 'Failed to cancel tournament', 500, 'CANCEL_FAILED');
    }
  },

  /**
   * PATCH /api/v1/admin/tournaments/:id/status
   * Super Admin status update
   */
  async updateTournamentStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!status || !VALID_STATUSES.includes(String(status).toLowerCase())) {
        return sendError(
          res,
          `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`,
          400,
          'INVALID_STATUS'
        );
      }

      const existing = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!existing) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const updated = await prisma.tournament.update({
        where: { id },
        data: {
          status: String(status).toLowerCase(),
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true },
          },
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
      });

      return sendSuccess(res, {
        tournament: formatTournament(updated, req.user),
        message: `Tournament status updated to ${status}`,
      });
    } catch (err) {
      console.error('Error updating tournament status:', err);
      return sendError(res, err.message || 'Failed to update status', 500, 'STATUS_UPDATE_FAILED');
    }
  },

  /**
   * DELETE /api/v1/admin/tournaments/:id
   * Safeguarded tournament deletion (Super Admin)
   */
  async deleteTournament(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!existing) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Safeguard: If tournament is ongoing, require force flag
      if (existing.status === 'ongoing' && req.query.force !== 'true') {
        return sendError(
          res,
          'Cannot delete an ongoing tournament directly. Please mark it as cancelled or completed first, or confirm forced deletion.',
          400,
          'TOURNAMENT_ONGOING'
        );
      }

      await prisma.tournament.delete({
        where: { id },
      });

      return sendSuccess(res, {
        id,
        message: `Tournament "${existing.name}" has been permanently deleted`,
      });
    } catch (err) {
      console.error('Error deleting tournament:', err);
      return sendError(res, err.message || 'Failed to delete tournament', 500, 'DELETE_FAILED');
    }
  },

  /**
   * GET /api/v1/tournaments/share/:shareIdentifier
   * Public user-side endpoint to view a specific shared tournament
   */
  async getPublicTournamentByShareId(req, res) {
    try {
      const shareIdentifier = req.params?.shareIdentifier;

      if (!shareIdentifier) {
        return sendError(res, 'Share identifier is required', 400, 'MISSING_SHARE_ID');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { shareableIdentifier: shareIdentifier },
        include: {
          user: {
            select: { id: true, name: true, avatar: true },
          },
          turf: {
            select: {
              id: true,
              name: true,
              city: true,
              images: true,
              logo: true,
              pricePerHour: true,
              sports: true,
              location: true,
            },
          },
        },
      });

      if (!tournament || tournament.status !== 'published') {
        return sendError(res, 'Published tournament not found or link has expired', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, {
        tournament: formatTournament(tournament, req.user),
      });
    } catch (err) {
      console.error('getPublicTournamentByShareId error:', err);
      return sendError(res, 'Failed to fetch shared tournament', 500, 'FETCH_FAILED');
    }
  },
};

module.exports = tournamentController;
