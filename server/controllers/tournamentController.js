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
  const currentVendorId = reqUser ? reqUser.vendorId || reqUser.id || reqUser.uid : null;
  const isAdmin = reqUser?.role === 'admin' || reqUser?.role === 'superadmin';
  const isOwner = Boolean(
    (currentUserId && (currentUserId === userId || currentUserId === vendorId)) ||
    (currentVendorId && (currentVendorId === vendorId || (t.turf?.vendorId && t.turf.vendorId === currentVendorId)))
  );

  const totalTeams = t.numberOfTeams !== null && t.numberOfTeams !== undefined
    ? Number(t.numberOfTeams)
    : (t.participantCapacity || 16);

  const registrationsList = Array.isArray(t.registrations) ? t.registrations : [];
  const acceptedTeamsCount = registrationsList.filter((r) => r.status === 'accepted').length;
  const pendingApplicationsCount = registrationsList.filter((r) => r.status === 'pending').length;
  const rejectedApplicationsCount = registrationsList.filter((r) => r.status === 'rejected').length;
  const remainingSlots = Math.max(0, totalTeams - acceptedTeamsCount);
  const isFull = acceptedTeamsCount >= totalTeams;

  // Lifecycle state evaluation
  const todayStr = new Date().toISOString().slice(0, 10);
  const startStr = String(t.startDate || '').slice(0, 10);
  const endStr = String(t.endDate || '').slice(0, 10);
  const regStartStr = t.registrationStartDate ? String(t.registrationStartDate).slice(0, 10) : null;
  const regEndStr = t.registrationEndDate ? String(t.registrationEndDate).slice(0, 10) : null;

  const isRegistrationNotOpenYet = Boolean(regStartStr && todayStr < regStartStr);
  const isRegistrationEnded = Boolean(regEndStr && todayStr > regEndStr);
  const isTournamentStarted = Boolean(startStr && todayStr >= startStr);
  const isTournamentCompleted = Boolean(endStr && todayStr > endStr);

  let lifecycleStatus = 'draft';
  let lifecycleLabel = 'DRAFT';

  if (t.status === 'cancelled') {
    lifecycleStatus = 'cancelled';
    lifecycleLabel = 'CANCELLED';
  } else if (isTournamentCompleted) {
    lifecycleStatus = 'completed';
    lifecycleLabel = 'COMPLETED';
  } else if (isTournamentStarted) {
    lifecycleStatus = 'ongoing';
    lifecycleLabel = 'ONGOING';
  } else if (t.status === 'published') {
    if (isFull) {
      lifecycleStatus = 'registration_closed';
      lifecycleLabel = 'TEAMS FULL';
    } else if (isRegistrationEnded) {
      lifecycleStatus = 'registration_closed';
      lifecycleLabel = 'REGISTRATION CLOSED';
    } else if (isRegistrationNotOpenYet) {
      lifecycleStatus = 'published';
      lifecycleLabel = 'UPCOMING';
    } else {
      // Within registration open window (regStart <= today <= regEnd)
      lifecycleStatus = 'registration_open';
      lifecycleLabel = 'REGISTRATION OPEN';
    }
  } else {
    lifecycleStatus = t.status || 'draft';
    lifecycleLabel = String(lifecycleStatus).toUpperCase();
  }

  // Registration blocked flag
  const isRegistrationBlocked =
    t.status !== 'published' ||
    isFull ||
    isRegistrationNotOpenYet ||
    isRegistrationEnded ||
    isTournamentStarted ||
    isTournamentCompleted;

  // Authenticated user's own registration
  let myRegistration = null;
  if (currentUserId && registrationsList.length > 0) {
    const found = registrationsList.find((r) => r.userId === currentUserId);
    if (found) {
      myRegistration = {
        id: found.id,
        teamName: found.teamName,
        captainName: found.captainName,
        captainPhone: found.captainPhone,
        captainEmail: found.captainEmail || null,
        players: found.players || [],
        status: found.status,
        rejectionReason: found.rejectionReason || null,
        createdAt: found.createdAt,
      };
    }
  }

  let teams = [];
  if (Array.isArray(t.teams)) {
    teams = t.teams;
  } else if (typeof t.teams === 'string') {
    try { teams = JSON.parse(t.teams); } catch (_) { teams = []; }
  }
  if (!teams || teams.length === 0) {
    const teamCount = t.numberOfTeams || 2;
    teams = Array.from({ length: teamCount }, (_, idx) => ({
      id: `team_${idx + 1}`,
      name: `Team ${idx + 1}`,
      players: [],
    }));
  }

  // Permissions:
  // - Admin can edit/delete
  // - User creator can edit/delete their own tournament
  // - Vendor creator can edit/delete their own tournament
  // - Vendor CANNOT edit/delete user-created tournaments
  // - User CANNOT edit/delete vendor-created tournaments or another user's tournaments
  const canEdit = Boolean(
    isAdmin ||
    (isCommunity && currentUserId && currentUserId === userId) ||
    (!isCommunity && currentUserId && currentUserId === vendorId)
  );

  return {
    id: t.id,
    creatorType,
    source: isCommunity ? 'USER CREATED' : 'TURF HOSTED',
    sourceLabel: isCommunity ? 'USER CREATED' : 'TURF HOSTED',
    sourceBadge: isCommunity ? '[USER CREATED]' : '[TURF HOSTED]',
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
    vendor: t.vendor
      ? {
          id: t.vendor.id,
          name: t.vendor.name,
          phone: t.vendor.phone,
          email: t.vendor.email,
        }
      : undefined,
    vendorName: t.vendor?.name || null,
    turfOwner: t.vendor?.name || null,
    userId,
    user: t.user
      ? {
          id: t.user.id,
          name: t.user.name,
          avatar: t.user.avatar || null,
          phone: t.user.phone || null,
        }
      : undefined,
    creatorName: isCommunity
      ? (t.user?.name || 'Community Member')
      : (t.vendor?.name || t.turf?.name || t.venueName || 'Turf Host'),
    creator: isCommunity
      ? (t.user?.name || 'Community Member')
      : (t.vendor?.name || t.turf?.name || t.venueName || 'Turf Host'),
    name: t.name,
    sport: t.sport,
    category: t.sport,
    startDate: t.startDate,
    endDate: t.endDate,
    registrationStartDate: t.registrationStartDate || null,
    registrationEndDate: t.registrationEndDate || null,
    numberOfTeams: totalTeams,
    playersPerTeam: t.playersPerTeam !== null && t.playersPerTeam !== undefined ? Number(t.playersPerTeam) : null,
    oversPerTeam: t.oversPerTeam !== null && t.oversPerTeam !== undefined ? Number(t.oversPerTeam) : null,
    teams,
    status: t.status,
    lifecycleStatus,
    lifecycleLabel,
    acceptedTeamsCount,
    pendingApplicationsCount,
    rejectedApplicationsCount,
    totalTeams,
    remainingSlots,
    isFull,
    isRegistrationOpen: !isRegistrationBlocked,
    isRegistrationBlocked,
    isRegistrationNotOpenYet,
    isRegistrationEnded,
    isTournamentStarted,
    isTournamentCompleted,
    registrationDeadline: regEndStr,
    myRegistration,
    description: t.description || '',
    rules: t.rules || '',
    bannerUrl: t.bannerUrl || null,
    venueName: t.venueName || t.turf?.name || null,
    city: t.city || t.turf?.city || null,
    venueLocation: t.venueLocation || t.turf?.location || null,
    entryFee: t.entryFee !== undefined && t.entryFee !== null ? Number(t.entryFee) : 0,
    prizePool: t.prizePool !== undefined && t.prizePool !== null ? Number(t.prizePool) : 0,
    prizeDetails: t.prizeDetails || null,
    participantCapacity: totalTeams,
    format: t.format || 'knockout',
    currentParticipantsCount: acceptedTeamsCount,
    contactPhone: t.contactPhone || null,
    contactEmail: t.contactEmail || null,
    createdBy: t.createdBy || null,
    shareableIdentifier: shareId,
    shareableUrl: shareId
      ? `https://turfbookingapp.com/tournament/${shareId}${turfId ? `?turfId=${turfId}` : ''}`
      : null,
    isOwner,
    registrations: (isOwner || isAdmin) ? registrationsList : undefined,
    canEdit,
    canDelete: canEdit,
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
              phone: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
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
   * Public list of currently active, published tournaments (both Turf-hosted and User-created) for UserApp
   */
  async getAvailableTournaments(req, res) {
    try {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      const todayStr = `${y}-${m}-${d}`;

      // Only published, active tournaments (NOT draft, NOT cancelled, NOT expired)
      const tournaments = await prisma.tournament.findMany({
        where: {
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
          registrations: true,
          user: {
            select: { id: true, name: true, avatar: true },
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
          turf: {
            select: {
              id: true,
              name: true,
              city: true,
              location: true,
              images: true,
              logo: true,
            },
          },
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
   * Displays both Vendor-created tournaments and User-created tournaments hosted at vendor's turf!
   */
  async getVendorTournaments(req, res) {
    try {
      const vendorId = req.vendor?.id || req.user?.id || req.user?.uid || req.user?.vendorId;
      const turfId = req.params?.turfId || req.query?.turfId;

      if (!vendorId) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      let where = {};
      if (turfId) {
        // Verify turf belongs to this vendor
        const turf = await prisma.turf.findUnique({
          where: { id: turfId },
          select: { id: true, vendorId: true },
        });
        if (!turf || turf.vendorId !== vendorId) {
          return sendError(res, 'Turf not found or does not belong to vendor', 403, 'FORBIDDEN');
        }
        where = {
          turfId,
          OR: [
            { vendorId },
            { turf: { vendorId } },
          ],
        };
      } else {
        // Query all turfs belonging to vendor
        const vendorTurfs = await prisma.turf.findMany({
          where: { vendorId },
          select: { id: true },
        });
        const turfIds = vendorTurfs.map((t) => t.id);
        where = {
          OR: [
            { turfId: { in: turfIds } },
            { vendorId: vendorId },
            { turf: { vendorId } },
          ],
        };
      }

      const tournaments = await prisma.tournament.findMany({
        where,
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true, vendorId: true },
          },
          registrations: true,
          user: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = tournaments.map((t) => formatTournament(t, req.user || req.vendor));

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
      const id = (req.params?.id || req.params?.tournamentId || '').trim();
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
              vendorId: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
              phone: true,
            },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
            },
          },
          registrations: {
            orderBy: { createdAt: 'desc' },
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
   * User creates a tournament (UserApp) - Turf MUST be selected first
   */
  async createUserTournament(req, res) {
    try {
      const userId = req.user?.id || req.user?.uid;
      if (!userId) {
        return sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
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
        teams,
        publishNow,
      } = req.body;

      const effectiveSport = (sport || category || '').trim();
      const errors = {};

      if (!turfId) {
        errors.turfId = 'Turf facility selection is required to create a tournament';
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

      // Verify that the selected turf exists in the database
      const turf = await prisma.turf.findUnique({
        where: { id: turfId },
        select: { id: true, vendorId: true, name: true, city: true, images: true, logo: true, location: true },
      });

      if (!turf) {
        return sendError(res, 'Selected turf venue was not found', 404, 'TURF_NOT_FOUND');
      }

      // Initialize or sanitize teams roster
      let initialTeams = [];
      if (Array.isArray(teams) && teams.length > 0) {
        initialTeams = teams.slice(0, teamsCount).map((tm, idx) => ({
          id: tm.id || `team_${idx + 1}`,
          name: (tm.name || `Team ${idx + 1}`).trim(),
          players: Array.isArray(tm.players)
            ? tm.players.slice(0, playersCount).map((p, pIdx) => ({
                id: p.id || `p_${Date.now()}_${pIdx}`,
                name: (p.name || `Player ${pIdx + 1}`).trim(),
                phone: p.phone ? String(p.phone).trim() : '',
                isInvited: Boolean(p.isInvited || p.phone),
              }))
            : [],
        }));
      } else {
        initialTeams = Array.from({ length: teamsCount }, (_, idx) => ({
          id: `team_${idx + 1}`,
          name: `Team ${idx + 1}`,
          players: [],
        }));
      }

      const shareableIdentifier = generateShareableIdentifier();
      const initialStatus = (publishNow === true || req.body?.status === 'published') ? 'published' : 'draft';

      const tournament = await prisma.tournament.create({
        data: {
          creatorType: 'USER',
          userId,
          turfId: turf.id,
          vendorId: turf.vendorId, // Associated with the turf's vendor!
          venueName: turf.name,
          city: turf.city,
          venueLocation: turf.location,
          name: name.trim(),
          sport: effectiveSport,
          startDate: String(startDate).slice(0, 32),
          endDate: String(endDate).slice(0, 32),
          numberOfTeams: teamsCount,
          playersPerTeam: playersCount,
          oversPerTeam: parsedOvers,
          teams: initialTeams,
          description: description ? description.trim() : null,
          rules: rules ? rules.trim() : null,
          bannerUrl: bannerUrl ? bannerUrl.trim() : null,
          status: initialStatus,
          shareableIdentifier,
          createdBy: req.user?.name || req.user?.phone || 'User',
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

      const formatted = formatTournament(tournament, req.user);

      return sendSuccess(res, {
        tournament: formatted,
        shareableUrl: formatted.shareableUrl,
        message: publishNow ? 'Tournament published successfully!' : 'Tournament saved as draft',
      });
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
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate,
        numberOfTeams,
        playersPerTeam,
        oversPerTeam,
        description,
        rules,
        bannerUrl,
        status,
        publishNow,
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
      if (!registrationStartDate) {
        errors.registrationStartDate = 'Registration opening date is required';
      }
      if (!registrationEndDate) {
        errors.registrationEndDate = 'Registration closing date is required';
      }
      if (!startDate) {
        errors.startDate = 'Tournament start date is required';
      }
      if (!endDate) {
        errors.endDate = 'Tournament end date is required';
      }

      // 4-Date sequence validation
      if (registrationStartDate && registrationEndDate && !validateDateStrings(registrationStartDate, registrationEndDate)) {
        errors.registrationDates = 'Registration closing date must be on or after registration opening date';
      }
      if (registrationEndDate && startDate && !validateDateStrings(registrationEndDate, startDate)) {
        errors.tournamentStartDate = 'Tournament start date must be on or after registration closing date';
      }
      if (startDate && endDate && !validateDateStrings(startDate, endDate)) {
        errors.tournamentDates = 'Tournament end date must be on or after tournament start date';
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
      const initialStatus = publishNow || status === 'published' ? 'published' : 'draft';

      const tournament = await prisma.tournament.create({
        data: {
          creatorType: 'VENDOR',
          turfId,
          vendorId,
          name: name.trim(),
          sport: effectiveSport,
          venueName: turf.name,
          city: turf.city,
          registrationStartDate: String(registrationStartDate).slice(0, 32),
          registrationEndDate: String(registrationEndDate).slice(0, 32),
          startDate: String(startDate).slice(0, 32),
          endDate: String(endDate).slice(0, 32),
          numberOfTeams: teamsCount,
          participantCapacity: teamsCount,
          playersPerTeam: playersCount,
          oversPerTeam: parsedOvers,
          description: description ? description.trim() : null,
          rules: rules ? rules.trim() : null,
          bannerUrl: bannerUrl ? bannerUrl.trim() : null,
          status: initialStatus,
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
   * POST /api/v1/vendor/tournaments
   * Create tournament endpoint supporting both Vendor and Admin callers
   */
  async createTournament(req, res) {
    try {
      const {
        name,
        description,
        sport,
        category,
        turfId,
        venueName,
        city,
        venueLocation,
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate,
        numberOfTeams,
        playersPerTeam,
        oversPerTeam,
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

      const effectiveSport = (sport || category || '').trim();
      const errors = {};
      if (!name || !name.trim()) errors.name = 'Tournament name is required';
      if (!effectiveSport) errors.sport = 'Sport type is required';
      if (!registrationStartDate) errors.registrationStartDate = 'Registration opening date is required';
      if (!registrationEndDate) errors.registrationEndDate = 'Registration closing date is required';
      if (!startDate) errors.startDate = 'Tournament start date is required';
      if (!endDate) errors.endDate = 'Tournament end date is required';

      // 4-Date validation sequence
      if (registrationStartDate && registrationEndDate && !validateDateStrings(registrationStartDate, registrationEndDate)) {
        errors.registrationDates = 'Registration closing date must be on or after registration opening date';
      }
      if (registrationEndDate && startDate && !validateDateStrings(registrationEndDate, startDate)) {
        errors.tournamentStartDate = 'Tournament start date must be on or after registration closing date';
      }
      if (startDate && endDate && !validateDateStrings(startDate, endDate)) {
        errors.tournamentDates = 'Tournament end date must be on or after tournament start date';
      }

      const teamsCount = numberOfTeams
        ? parseInt(numberOfTeams, 10)
        : (participantCapacity ? parseInt(participantCapacity, 10) : 8);
      if (isNaN(teamsCount) || teamsCount < 2) {
        errors.numberOfTeams = 'Number of teams must be at least 2';
      }

      const playersCount = playersPerTeam ? parseInt(playersPerTeam, 10) : 11;
      if (isNaN(playersCount) || playersCount < 1) {
        errors.playersPerTeam = 'Players per team must be at least 1';
      }

      const isCricket = effectiveSport.toLowerCase().includes('cricket');
      let parsedOvers = null;
      if (isCricket) {
        if (oversPerTeam !== undefined && oversPerTeam !== null && oversPerTeam !== '') {
          parsedOvers = parseInt(oversPerTeam, 10);
          if (isNaN(parsedOvers) || parsedOvers < 1) {
            errors.oversPerTeam = 'Overs per team must be greater than 0 for Cricket';
          }
        }
      }

      if (entryFee !== undefined && entryFee !== '' && (isNaN(Number(entryFee)) || Number(entryFee) < 0)) {
        errors.entryFee = 'Entry fee must be a valid non-negative number';
      }
      if (prizePool !== undefined && prizePool !== '' && (isNaN(Number(prizePool)) || Number(prizePool) < 0)) {
        errors.prizePool = 'Prize pool must be a valid non-negative number';
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      let resolvedVendorId = req.vendor?.id || req.user?.vendorId || null;
      let resolvedVenue = venueName ? venueName.trim() : null;
      let resolvedCity = city ? city.trim() : null;

      if (turfId) {
        const turf = await prisma.turf.findUnique({
          where: { id: turfId },
          select: { id: true, name: true, city: true, vendorId: true },
        });
        if (turf) {
          if (!resolvedVendorId) resolvedVendorId = turf.vendorId;
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
          sport: effectiveSport,
          turfId: turfId || null,
          vendorId: resolvedVendorId,
          venueName: resolvedVenue || 'TBD',
          city: resolvedCity,
          venueLocation: venueLocation || null,
          registrationStartDate: String(registrationStartDate).slice(0, 32),
          registrationEndDate: String(registrationEndDate).slice(0, 32),
          startDate: String(startDate).slice(0, 32),
          endDate: String(endDate).slice(0, 32),
          numberOfTeams: teamsCount,
          participantCapacity: teamsCount,
          playersPerTeam: playersCount,
          oversPerTeam: parsedOvers,
          entryFee: entryFee !== undefined && entryFee !== '' ? Number(entryFee) : 0,
          prizePool: prizePool !== undefined && prizePool !== '' ? Number(prizePool) : 0,
          prizeDetails: prizeDetails || null,
          format: format ? String(format).trim().toLowerCase() : 'knockout',
          rules: rules ? rules.trim() : null,
          bannerUrl: bannerUrl ? bannerUrl.trim() : null,
          status: status && VALID_STATUSES.includes(status.toLowerCase()) ? status.toLowerCase() : 'draft',
          contactPhone: contactPhone ? contactPhone.trim() : null,
          contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : null,
          createdBy: req.user?.id || req.user?.uid || req.vendor?.id || 'vendor',
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
      console.error('Error creating tournament:', err);
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
        registrationStartDate,
        registrationEndDate,
        startDate,
        endDate,
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

      const sDate = startDate !== undefined ? String(startDate).slice(0, 32) : existing.startDate;
      const eDate = endDate !== undefined ? String(endDate).slice(0, 32) : existing.endDate;
      const rSDate = registrationStartDate !== undefined ? String(registrationStartDate).slice(0, 32) : existing.registrationStartDate;
      const rEDate = registrationEndDate !== undefined ? String(registrationEndDate).slice(0, 32) : existing.registrationEndDate;

      // 4-Date validation sequence
      if (rSDate && rEDate && !validateDateStrings(rSDate, rEDate)) {
        errors.registrationDates = 'Registration closing date must be on or after registration opening date';
      }
      if (rEDate && sDate && !validateDateStrings(rEDate, sDate)) {
        errors.tournamentStartDate = 'Tournament start date must be on or after registration closing date';
      }
      if (sDate && eDate && !validateDateStrings(sDate, eDate)) {
        errors.tournamentDates = 'Tournament end date must be on or after tournament start date';
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
      if (registrationStartDate !== undefined) updateData.registrationStartDate = String(registrationStartDate).slice(0, 32);
      if (registrationEndDate !== undefined) updateData.registrationEndDate = String(registrationEndDate).slice(0, 32);
      if (startDate !== undefined) updateData.startDate = String(startDate).slice(0, 32);
      if (endDate !== undefined) updateData.endDate = String(endDate).slice(0, 32);
      if (numberOfTeams !== undefined) {
        updateData.numberOfTeams = parseInt(numberOfTeams, 10);
        updateData.participantCapacity = parseInt(numberOfTeams, 10);
      }
      if (playersPerTeam !== undefined) updateData.playersPerTeam = parseInt(playersPerTeam, 10);
      if (oversPerTeam !== undefined) updateData.oversPerTeam = oversPerTeam ? parseInt(oversPerTeam, 10) : null;

      // Admin or facility fields
      if (turfId !== undefined && turfId !== existing.turfId) {
        if (turfId) {
          const turf = await prisma.turf.findUnique({
            where: { id: turfId },
            select: { id: true, name: true, city: true, location: true, vendorId: true },
          });
          if (!turf) {
            return sendError(res, 'Selected turf venue was not found', 404, 'TURF_NOT_FOUND');
          }
          updateData.turfId = turf.id;
          updateData.vendorId = turf.vendorId;
          updateData.venueName = turf.name;
          updateData.city = turf.city;
          updateData.venueLocation = turf.location;
        } else {
          updateData.turfId = null;
        }
      } else if (venueName !== undefined) {
        updateData.venueName = venueName ? venueName.trim() : existing.venueName;
      }
      if (city !== undefined) updateData.city = city ? city.trim() : null;
      if (venueLocation !== undefined) updateData.venueLocation = venueLocation || null;
      if (entryFee !== undefined) updateData.entryFee = Number(entryFee);
      if (prizePool !== undefined) updateData.prizePool = prizePool !== '' ? Number(prizePool) : 0;
      if (prizeDetails !== undefined) updateData.prizeDetails = prizeDetails || null;
      if (participantCapacity !== undefined && numberOfTeams === undefined) {
        updateData.participantCapacity = parseInt(participantCapacity, 10);
      }
      if (format !== undefined) updateData.format = String(format).trim().toLowerCase();
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone ? contactPhone.trim() : null;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;

      if (req.body.teams !== undefined) {
        const teamsInput = Array.isArray(req.body.teams) ? req.body.teams : [];
        const maxPlayers = updateData.playersPerTeam || existing.playersPerTeam || 11;
        updateData.teams = teamsInput.map((tm, idx) => ({
          id: tm.id || `team_${idx + 1}`,
          name: (tm.name || `Team ${idx + 1}`).trim(),
          players: Array.isArray(tm.players)
            ? tm.players.slice(0, maxPlayers).map((p, pIdx) => ({
                id: p.id || `p_${Date.now()}_${pIdx}`,
                name: (p.name || `Player ${pIdx + 1}`).trim(),
                phone: p.phone ? String(p.phone).trim() : '',
                isInvited: Boolean(p.isInvited || p.phone),
              }))
            : [],
        }));
      }

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
   * PUT /api/v1/tournaments/:id/teams
   * Creator updates teams and player rosters for their tournament
   */
  async updateTournamentTeams(req, res) {
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
        currentUserId &&
        ((existing.userId && existing.userId === currentUserId) ||
         (existing.vendorId && existing.vendorId === currentUserId))
      );

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Access denied: You cannot manage teams for this tournament', 403, 'FORBIDDEN');
      }

      const { teams } = req.body;
      if (!Array.isArray(teams)) {
        return sendError(res, 'Teams must be provided as an array', 400, 'INVALID_TEAMS');
      }

      const maxPlayers = existing.playersPerTeam || 11;
      const sanitizedTeams = teams.map((tm, idx) => {
        const rawPlayers = Array.isArray(tm.players) ? tm.players : [];
        if (rawPlayers.length > maxPlayers) {
          throw new Error(`Team "${tm.name || `Team ${idx + 1}`}" exceeds maximum capacity of ${maxPlayers} players`);
        }
        return {
          id: tm.id || `team_${idx + 1}`,
          name: (tm.name || `Team ${idx + 1}`).trim(),
          players: rawPlayers.map((p, pIdx) => ({
            id: p.id || `p_${Date.now()}_${pIdx}`,
            name: (p.name || `Player ${pIdx + 1}`).trim(),
            phone: p.phone ? String(p.phone).trim() : '',
            isInvited: Boolean(p.isInvited || p.phone),
          })),
        };
      });

      const updated = await prisma.tournament.update({
        where: { id },
        data: { teams: sanitizedTeams },
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
      console.error('updateTournamentTeams error:', err);
      return sendError(res, err.message || 'Failed to update teams', 400, 'UPDATE_FAILED');
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

      const tournament = await prisma.tournament.findFirst({
        where: {
          OR: [
            { shareableIdentifier: shareIdentifier },
            { id: shareIdentifier },
          ],
        },
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
          registrations: true,
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

  /**
   * POST /api/v1/tournaments/:id/register
   * User registers their team for a tournament
   */
  async registerTeam(req, res) {
    try {
      const tournamentId = req.params?.id;
      const userId = req.user?.id || req.user?.uid;

      if (!userId) {
        return sendError(res, 'Authentication required to register team', 401, 'AUTH_REQUIRED');
      }

      if (!tournamentId) {
        return sendError(res, 'Tournament ID is required', 400, 'MISSING_ID');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          registrations: true,
          turf: { select: { id: true, name: true, city: true } },
        },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Check status
      if (tournament.status === 'draft') {
        return sendError(res, 'This tournament is not yet published for registration', 400, 'NOT_PUBLISHED');
      }
      if (tournament.status === 'cancelled') {
        return sendError(res, 'This tournament has been cancelled', 400, 'TOURNAMENT_CANCELLED');
      }

      const todayStr = new Date().toISOString().slice(0, 10);
      const startStr = String(tournament.startDate || '').slice(0, 10);
      const endStr = String(tournament.endDate || '').slice(0, 10);
      const regStartStr = tournament.registrationStartDate ? String(tournament.registrationStartDate).slice(0, 10) : null;
      const regEndStr = tournament.registrationEndDate ? String(tournament.registrationEndDate).slice(0, 10) : null;

      if (endStr && todayStr > endStr) {
        return sendError(res, 'This tournament has already completed. Registrations are closed.', 400, 'TOURNAMENT_COMPLETED');
      }
      if (startStr && todayStr >= startStr) {
        return sendError(res, 'Tournament has already started. New registrations are not permitted.', 400, 'TOURNAMENT_ONGOING');
      }
      if (regStartStr && todayStr < regStartStr) {
        return sendError(res, `Registration for this tournament has not opened yet. Registration opens on ${regStartStr}.`, 400, 'REGISTRATION_NOT_OPEN');
      }
      if (regEndStr && todayStr > regEndStr) {
        return sendError(res, `Registration deadline (${regEndStr}) has passed. Registration is closed.`, 400, 'DEADLINE_PASSED');
      }

      const totalTeams = tournament.numberOfTeams !== null && tournament.numberOfTeams !== undefined
        ? Number(tournament.numberOfTeams)
        : (tournament.participantCapacity || 16);

      const acceptedCount = (tournament.registrations || []).filter((r) => r.status === 'accepted').length;

      if (acceptedCount >= totalTeams) {
        return sendError(res, 'This tournament is full. All team slots have been filled.', 400, 'TOURNAMENT_FULL');
      }

      // Check duplicate application by this user
      const existingReg = (tournament.registrations || []).find((r) => r.userId === userId);
      if (existingReg) {
        return sendError(
          res,
          'You have already submitted a team registration for this tournament. Multiple applications are not permitted.',
          400,
          'DUPLICATE_REGISTRATION',
          { registrationId: existingReg.id, status: existingReg.status }
        );
      }

      const {
        teamName,
        captainName,
        captainPhone,
        captainEmail,
        players,
      } = req.body;

      const errors = {};
      if (!teamName || !teamName.trim()) {
        errors.teamName = 'Team name is required';
      }
      if (!captainName || !captainName.trim()) {
        errors.captainName = 'Captain name is required';
      }
      if (!captainPhone || !captainPhone.trim()) {
        errors.captainPhone = 'Captain phone number is required';
      } else {
        const cleanPhone = captainPhone.replace(/[^0-9]/g, '');
        if (cleanPhone.length < 10) {
          errors.captainPhone = 'Captain phone number must be at least 10 digits';
        }
      }

      // Check required players based dynamically on tournament playersPerTeam
      const requiredPlayers = tournament.playersPerTeam !== null && tournament.playersPerTeam !== undefined
        ? Number(tournament.playersPerTeam)
        : 11;

      if (!Array.isArray(players) || players.length !== requiredPlayers) {
        errors.players = `Exactly ${requiredPlayers} player entries are required for this tournament (received ${Array.isArray(players) ? players.length : 0})`;
      } else {
        const playerPhones = new Set();
        for (let i = 0; i < players.length; i++) {
          const p = players[i];
          const pNum = i + 1;
          if (!p || typeof p !== 'object' || !p.name || !String(p.name).trim()) {
            errors[`player_${pNum}_name`] = `Player #${pNum} name is required`;
            break;
          }
          if (!p.phone || !String(p.phone).trim()) {
            errors[`player_${pNum}_phone`] = `Player #${pNum} phone is required`;
            break;
          }
          const cleanPPhone = String(p.phone).replace(/[^0-9]/g, '');
          if (cleanPPhone.length < 10) {
            errors[`player_${pNum}_phone`] = `Player #${pNum} phone must be at least 10 digits`;
            break;
          }
          if (playerPhones.has(cleanPPhone)) {
            errors[`player_${pNum}_duplicate`] = `Duplicate phone number detected for Player #${pNum}`;
            break;
          }
          playerPhones.add(cleanPPhone);
        }
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      // Clean player entries
      const cleanedPlayers = players.map((p, idx) => ({
        index: idx + 1,
        name: String(p.name).trim(),
        phone: String(p.phone).trim(),
      }));

      const registration = await prisma.tournamentRegistration.create({
        data: {
          tournamentId,
          userId,
          teamName: teamName.trim(),
          captainName: captainName.trim(),
          captainPhone: captainPhone.trim(),
          captainEmail: captainEmail ? captainEmail.trim().toLowerCase() : null,
          players: cleanedPlayers,
          status: 'pending',
        },
      });

      return sendSuccess(
        res,
        {
          registration,
          message: 'Registration Submitted. Status: Pending Approval. The turf owner must approve the team.',
        },
        201
      );
    } catch (err) {
      console.error('registerTeam error:', err);
      if (err.code === 'P2002') {
        return sendError(res, 'You have already submitted an application for this tournament', 400, 'DUPLICATE_REGISTRATION');
      }
      return sendError(res, 'Failed to submit team registration', 500, 'REGISTRATION_FAILED');
    }
  },

  /**
   * GET /api/v1/tournaments/:id/my-registration
   * Retrieve current user's registration for a tournament
   */
  async getMyRegistration(req, res) {
    try {
      const tournamentId = req.params?.id;
      const userId = req.user?.id || req.user?.uid;

      if (!userId) {
        return sendError(res, 'Authentication required', 401, 'AUTH_REQUIRED');
      }

      const registration = await prisma.tournamentRegistration.findUnique({
        where: {
          tournamentId_userId: {
            tournamentId,
            userId,
          },
        },
      });

      return sendSuccess(res, { registration });
    } catch (err) {
      console.error('getMyRegistration error:', err);
      return sendError(res, 'Failed to fetch registration', 500, 'FETCH_FAILED');
    }
  },

  /**
   * GET /api/v1/vendor/tournaments/:id/registrations
   * Vendor retrieves all team registrations for their tournament
   */
  async getTournamentRegistrations(req, res) {
    try {
      const tournamentId = (req.params?.id || req.params?.tournamentId || '').trim();
      const currentVendorId = req.vendor?.id || req.user?.vendorId || req.user?.id || req.user?.uid;

      console.log(`📡 [VendorAPI] getTournamentRegistrations requested for tournament: "${tournamentId}", vendor: "${currentVendorId}"`);

      if (!currentVendorId) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: {
          turf: { select: { id: true, vendorId: true, name: true } },
        },
      });

      if (!tournament) {
        console.warn(`⚠️ [VendorAPI] Tournament "${tournamentId}" not found in database`);
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      const isOwner = Boolean(
        (tournament.vendorId && tournament.vendorId === currentVendorId) ||
        (tournament.turf?.vendorId && tournament.turf.vendorId === currentVendorId) ||
        (tournament.userId && tournament.userId === currentVendorId)
      );

      if (!isOwner && !isAdmin) {
        console.warn(`⛔ [VendorAPI] Vendor "${currentVendorId}" is not owner of tournament "${tournamentId}" (turf vendor: "${tournament.turf?.vendorId}", tourn vendor: "${tournament.vendorId}")`);
        return sendError(res, 'Access denied: You do not own this tournament or its turf', 403, 'FORBIDDEN');
      }

      const registrations = await prisma.tournamentRegistration.findMany({
        where: { tournamentId },
        orderBy: { createdAt: 'desc' },
      });

      console.log(`✅ [VendorAPI] Returning ${registrations.length} registrations for tournament "${tournament.name}" (${tournamentId})`);

      const totalTeams = tournament.numberOfTeams !== null && tournament.numberOfTeams !== undefined
        ? Number(tournament.numberOfTeams)
        : (tournament.participantCapacity || 16);

      const acceptedCount = registrations.filter((r) => r.status === 'accepted').length;
      const pendingCount = registrations.filter((r) => r.status === 'pending').length;
      const rejectedCount = registrations.filter((r) => r.status === 'rejected').length;
      const remainingSlots = Math.max(0, totalTeams - acceptedCount);

      return sendSuccess(res, {
        registrations,
        summary: {
          totalTeams,
          acceptedCount,
          pendingCount,
          rejectedCount,
          remainingSlots,
          isFull: acceptedCount >= totalTeams,
        },
      });
    } catch (err) {
      console.error('getTournamentRegistrations error:', err);
      return sendError(res, 'Failed to fetch registrations', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/tournaments/:id/registrations/:regId/accept
   * Vendor accepts a pending team registration (atomic slot verification)
   */
  async acceptRegistration(req, res) {
    try {
      const tournamentId = (req.params?.id || req.params?.tournamentId || '').trim();
      const regId = (req.params?.regId || req.params?.registrationId || '').trim();
      const currentVendorId = req.vendor?.id || req.user?.vendorId || req.user?.id || req.user?.uid;

      if (!currentVendorId) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { turf: { select: { id: true, vendorId: true } } },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      const isOwner = Boolean(
        (tournament.vendorId && tournament.vendorId === currentVendorId) ||
        (tournament.turf?.vendorId && tournament.turf.vendorId === currentVendorId) ||
        (tournament.userId && tournament.userId === currentVendorId)
      );

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Access denied: You cannot manage registrations for this tournament', 403, 'FORBIDDEN');
      }

      // Perform atomic transaction
      const outcome = await prisma.$transaction(async (tx) => {
        const reg = await tx.tournamentRegistration.findUnique({
          where: { id: regId },
        });

        if (!reg || reg.tournamentId !== tournamentId) {
          const err = new Error('Registration not found');
          err.code = 'NOT_FOUND';
          throw err;
        }

        if (reg.status === 'accepted') {
          return { registration: reg, alreadyAccepted: true };
        }

        const totalTeams = tournament.numberOfTeams !== null && tournament.numberOfTeams !== undefined
          ? Number(tournament.numberOfTeams)
          : (tournament.participantCapacity || 16);

        const currentAccepted = await tx.tournamentRegistration.count({
          where: { tournamentId, status: 'accepted' },
        });

        if (currentAccepted >= totalTeams) {
          const err = new Error('Tournament is full. All team slots have been filled.');
          err.code = 'TOURNAMENT_FULL';
          throw err;
        }

        const updated = await tx.tournamentRegistration.update({
          where: { id: regId },
          data: {
            status: 'accepted',
            rejectionReason: null,
          },
        });

        const newAcceptedCount = currentAccepted + 1;
        const remainingSlots = Math.max(0, totalTeams - newAcceptedCount);

        // Keep currentParticipantsCount on tournament updated
        await tx.tournament.update({
          where: { id: tournamentId },
          data: { currentParticipantsCount: newAcceptedCount },
        });

        return {
          registration: updated,
          acceptedCount: newAcceptedCount,
          totalTeams,
          remainingSlots,
        };
      });

      return sendSuccess(res, {
        registration: outcome.registration,
        summary: {
          acceptedCount: outcome.acceptedCount,
          totalTeams: outcome.totalTeams,
          remainingSlots: outcome.remainingSlots,
        },
        message: 'Team application accepted successfully',
      });
    } catch (err) {
      console.error('acceptRegistration error:', err);
      if (err.code === 'TOURNAMENT_FULL') {
        return sendError(res, 'Tournament is full. Cannot accept more teams.', 400, 'TOURNAMENT_FULL');
      }
      if (err.code === 'NOT_FOUND') {
        return sendError(res, 'Registration not found', 404, 'NOT_FOUND');
      }
      return sendError(res, 'Failed to accept registration', 500, 'ACCEPT_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/tournaments/:id/registrations/:regId/reject
   * Vendor rejects a team registration
   */
  async rejectRegistration(req, res) {
    try {
      const tournamentId = (req.params?.id || req.params?.tournamentId || '').trim();
      const regId = (req.params?.regId || req.params?.registrationId || '').trim();
      const { reason, rejectionReason } = req.body;
      const currentVendorId = req.vendor?.id || req.user?.vendorId || req.user?.id || req.user?.uid;

      if (!currentVendorId) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id: tournamentId },
        include: { turf: { select: { id: true, vendorId: true } } },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      const isOwner = Boolean(
        (tournament.vendorId && tournament.vendorId === currentVendorId) ||
        (tournament.turf?.vendorId && tournament.turf.vendorId === currentVendorId) ||
        (tournament.userId && tournament.userId === currentVendorId)
      );

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Access denied: You cannot manage registrations for this tournament', 403, 'FORBIDDEN');
      }

      const reg = await prisma.tournamentRegistration.findUnique({
        where: { id: regId },
      });

      if (!reg || reg.tournamentId !== tournamentId) {
        return sendError(res, 'Registration not found', 404, 'NOT_FOUND');
      }

      const wasAccepted = reg.status === 'accepted';
      const effectiveReason = (reason || rejectionReason || 'Application declined by organizer').trim();

      const updated = await prisma.tournamentRegistration.update({
        where: { id: regId },
        data: {
          status: 'rejected',
          rejectionReason: effectiveReason,
        },
      });

      const totalTeams = tournament.numberOfTeams !== null && tournament.numberOfTeams !== undefined
        ? Number(tournament.numberOfTeams)
        : (tournament.participantCapacity || 16);

      const acceptedCount = await prisma.tournamentRegistration.count({
        where: { tournamentId, status: 'accepted' },
      });

      if (wasAccepted) {
        await prisma.tournament.update({
          where: { id: tournamentId },
          data: { currentParticipantsCount: acceptedCount },
        });
      }

      const remainingSlots = Math.max(0, totalTeams - acceptedCount);

      return sendSuccess(res, {
        registration: updated,
        summary: {
          acceptedCount,
          totalTeams,
          remainingSlots,
        },
        message: 'Team application rejected',
      });
    } catch (err) {
      console.error('rejectRegistration error:', err);
      return sendError(res, 'Failed to reject registration', 500, 'REJECT_FAILED');
    }
  },
};

module.exports = tournamentController;
