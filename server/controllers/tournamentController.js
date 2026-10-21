const crypto = require('crypto');
const prisma = require('../config/prisma');
const { sendSuccess, sendError, sendPaginated } = require('../utils/response');
const { tournamentShareUrl } = require('../utils/shareUrl');
const notificationService = require('../services/notificationService');

const VALID_STATUSES = ['draft', 'pending_approval', 'published', 'rejected', 'ongoing', 'completed', 'cancelled'];
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
 * Duplicate-create protection.
 * A flaky network makes the app retry a POST that the server already processed, which
 * created the same tournament twice. We treat the same creator + turf + name + dates
 * created within the last 10 minutes as the same request and return the existing row.
 * The in-memory lock covers two identical requests arriving at the same moment.
 */
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;
const inFlightCreates = new Map();

async function findRecentDuplicate({ creatorType, ownerId, turfId, name, startDate, endDate }) {
  if (!name || !startDate || !endDate) return null;
  return prisma.tournament.findFirst({
    where: {
      creatorType,
      ...(creatorType === 'USER' ? { userId: ownerId } : { vendorId: ownerId || null }),
      turfId: turfId || null,
      name: { equals: String(name).trim(), mode: 'insensitive' },
      startDate: String(startDate).slice(0, 32),
      endDate: String(endDate).slice(0, 32),
      status: { not: 'cancelled' },
      createdAt: { gte: new Date(Date.now() - DUPLICATE_WINDOW_MS) },
    },
    orderBy: { createdAt: 'asc' },
    include: {
      turf: { select: { id: true, name: true, city: true, images: true, logo: true, location: true } },
      user: { select: { id: true, name: true, avatar: true } },
    },
  });
}

async function withCreateLock(key, fn) {
  if (inFlightCreates.has(key)) {
    // Wait for the first request, then let the caller re-check the DB for its result
    try { await inFlightCreates.get(key); } catch (_) { /* ignore */ }
    return { waited: true };
  }
  const promise = fn();
  inFlightCreates.set(key, promise);
  try {
    return { waited: false, value: await promise };
  } finally {
    inFlightCreates.delete(key);
  }
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
  } else if (t.status === 'rejected' || t.approvalStatus === 'rejected') {
    lifecycleStatus = 'rejected';
    lifecycleLabel = 'REJECTED';
  } else if (t.status === 'pending_approval' || t.approvalStatus === 'pending') {
    lifecycleStatus = 'pending_approval';
    lifecycleLabel = 'PENDING APPROVAL';
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
    approvalStatus: t.approvalStatus || (t.status === 'pending_approval' ? 'pending' : (t.status === 'rejected' ? 'rejected' : 'approved')),
    rejectionReason: t.rejectionReason || null,
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
    shareableUrl: (shareId && t.status === 'published')
      ? tournamentShareUrl(shareId, turfId)
      : null,
    isOwner,
    isManager: isOwner,
    bracket: t.bracket && typeof t.bracket === 'object' && Object.keys(t.bracket).length > 0 ? t.bracket : null,
    acceptedTeams: registrationsList
      .filter((r) => r.status === 'accepted')
      .map((r, idx) => ({
        id: r.id,
        teamId: r.id,
        name: r.teamName,
        teamName: r.teamName,
        captainName: r.captainName,
        captainPhone: r.captainPhone,
        players: Array.isArray(r.players) ? r.players : [],
        seed: idx + 1,
      })),
    registrations: registrationsList,
    canEdit,
    canDelete: canEdit,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

/**
 * Registration columns needed for list screens. `players` (JSON roster) is
 * intentionally excluded: it is the heaviest column and list cards never show it.
 */
const REGISTRATION_LIST_SELECT = {
  id: true,
  userId: true,
  status: true,
  teamName: true,
  captainName: true,
  captainPhone: true,
  captainEmail: true,
  rejectionReason: true,
  createdAt: true,
};

/**
 * Heavy JSON / text columns never needed by list cards.
 * (bracket can be hundreds of KB once matches have scores & rosters.)
 */
const TOURNAMENT_LIST_OMIT = { bracket: true, teams: true, rules: true };

/**
 * Slim payload for list endpoints (Available / My / Vendor list).
 * Full data (bracket, rosters, registrations, rules) is only returned by
 * GET /tournaments/:id.
 */
function formatTournamentSummary(t, reqUser = null) {
  const full = formatTournament(t, reqUser);
  if (!full) return null;
  const {
    registrations,
    acceptedTeams,
    bracket,
    teams,
    rules,
    description,
    prizeDetails,
    venueLocation,
    ...rest
  } = full;
  return {
    ...rest,
    registrationsCount: Array.isArray(registrations) ? registrations.length : 0,
    hasBracket: Boolean(t.bracket && typeof t.bracket === 'object' && Object.keys(t.bracket).length > 0),
    isSummary: true,
  };
}

/**
 * Cryptographically-secure Fisher-Yates shuffle. Used for the tournament draw so
 * that NOBODY (host, vendor, admin or players) can choose who plays whom.
 */
function secureShuffle(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(0, i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Bit-reversal order of match indexes -> spreads BYEs evenly across the bracket. */
function byeSpreadOrder(matchCount) {
  const bits = Math.max(0, Math.log2(matchCount));
  return Array.from({ length: matchCount }, (_, i) => {
    let rev = 0;
    for (let b = 0; b < bits; b++) if (i & (1 << b)) rev |= 1 << (bits - 1 - b);
    return rev;
  });
}

/** Leading number of a score string: "142/6 (10.0 ov)" -> 142, "3" -> 3 */
function parseScoreValue(v) {
  const m = String(v ?? '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function roundNameFor(roundIdx, totalRounds) {
  const fromFinal = totalRounds - roundIdx;
  if (fromFinal === 0) return 'Final';
  if (fromFinal === 1) return 'Semi-Finals';
  if (fromFinal === 2) return 'Quarter-Finals';
  return `Round of ${Math.pow(2, fromFinal + 1)}`;
}

/**
 * Fire-and-forget: never make the API response wait for push notifications.
 */
function notifyInBackground(params) {
  Promise.resolve()
    .then(() => notificationService.sendNotification(params))
    .catch((e) => console.warn('⚠️ Background notification failed:', e.message));
}

const tournamentController = {
  formatTournament,
  formatTournamentSummary,

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

      // Aggregate status counts for quick KPI cards (single GROUP BY, no full table load)
      const grouped = await prisma.tournament.groupBy({ by: ['status'], _count: { _all: true } });
      const countOf = (st) => grouped.find((g) => g.status === st)?._count?._all || 0;
      const stats = {
        total: grouped.reduce((sum, g) => sum + g._count._all, 0),
        draft: countOf('draft'),
        published: countOf('published'),
        ongoing: countOf('ongoing'),
        completed: countOf('completed'),
        cancelled: countOf('cancelled'),
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
        omit: TOURNAMENT_LIST_OMIT,
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
          registrations: { select: REGISTRATION_LIST_SELECT },
          user: {
            select: { id: true, name: true, avatar: true },
          },
        },
        orderBy: [{ startDate: 'asc' }, { createdAt: 'desc' }],
        take: 100,
      });

      const formatted = tournaments.map((t) => formatTournamentSummary(t, req.user));

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
        omit: TOURNAMENT_LIST_OMIT,
        include: {
          registrations: { select: REGISTRATION_LIST_SELECT },
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

      const formatted = tournaments.map((t) => formatTournamentSummary(t, req.user));

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

      let where;
      if (turfId) {
        // Verify turf belongs to this vendor
        const turf = await prisma.turf.findUnique({
          where: { id: turfId },
          select: { id: true, vendorId: true },
        });
        if (!turf || turf.vendorId !== vendorId) {
          return sendError(res, 'Turf not found or does not belong to vendor', 403, 'FORBIDDEN');
        }
        where = { turfId };
      } else {
        // One query: tournaments created by vendor OR hosted at any of vendor's turfs
        where = { OR: [{ vendorId }, { turf: { vendorId } }] };
      }

      const tournaments = await prisma.tournament.findMany({
        where,
        omit: TOURNAMENT_LIST_OMIT,
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true, vendorId: true },
          },
          registrations: { select: REGISTRATION_LIST_SELECT },
          user: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 200,
      });

      const formatted = tournaments.map((t) => formatTournamentSummary(t, req.user || req.vendor));

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

      const tournament = await prisma.tournament.findFirst({
        where: {
          OR: [
            { id },
            { shareableIdentifier: id },
          ],
        },
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

      // Gated access: If tournament is not published, only owner, turf vendor, or admin can access
      if (tournament.status !== 'published') {
        const currentUserId = req.user?.id || req.user?.uid;
        const currentVendorId = req.vendor?.id || req.user?.vendorId || req.user?.id;
        const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin' || req.vendor?.role === 'admin';
        const isCreator = currentUserId && (currentUserId === tournament.userId || currentUserId === tournament.vendorId);
        const isTurfVendor = currentVendorId && (
          currentVendorId === tournament.vendorId ||
          (tournament.turf && tournament.turf.vendorId === currentVendorId)
        );

        if (!isAdmin && !isCreator && !isTurfVendor) {
          return sendError(res, 'This tournament is pending approval or not publicly available', 403, 'FORBIDDEN');
        }
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
      const shouldPublish = Boolean(
        publishNow === true ||
        req.body?.publishImmediately === true ||
        req.body?.status === 'published' ||
        req.body?.status === 'pending_approval'
      );
      const initialStatus = shouldPublish ? 'pending_approval' : 'draft';
      const initialApprovalStatus = shouldPublish ? 'pending' : 'draft';

      const dupQuery = { creatorType: 'USER', ownerId: userId, turfId: turf.id, name, startDate, endDate };
      const dupKey = ['USER', userId, turf.id, name.trim().toLowerCase(), startDate, endDate].join('|');

      const locked = await withCreateLock(dupKey, async () => {
        const existing = await findRecentDuplicate(dupQuery);
        if (existing) return { existing };
        const created = await prisma.tournament.create({
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
            registrationStartDate: req.body?.registrationStartDate ? String(req.body.registrationStartDate).slice(0, 32) : null,
            registrationEndDate: req.body?.registrationEndDate ? String(req.body.registrationEndDate).slice(0, 32) : null,
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
            approvalStatus: initialApprovalStatus,
            shareableIdentifier,
            createdBy: req.user?.name || req.user?.phone || 'User',
          },
          include: {
            turf: {
              select: { id: true, name: true, city: true, images: true, logo: true, location: true, vendorId: true },
            },
            user: {
              select: { id: true, name: true, avatar: true, phone: true },
            },
          },
        });
        return { created };
      });

      let tournament = locked.value?.created || locked.value?.existing || null;
      if (!tournament && locked.waited) tournament = await findRecentDuplicate(dupQuery);
      if (!tournament) {
        return sendError(res, 'Failed to create tournament', 500, 'CREATE_FAILED');
      }

      // Notify the vendor who owns the selected turf via FCM push notification
      if (shouldPublish && turf.vendorId && locked.value?.created) {
        const creatorName = req.user?.name || req.user?.phone || 'A user';
        const notifTitle = '🏆 Tournament Request Received';
        const notifBody = `${creatorName} requested to conduct "${name.trim()}" at ${turf.name}. Tap to review and approve.`;
        try {
          console.log(`[Tournament Request Trace] User ID: ${userId} → Turf ID: ${turf.id} → Vendor ID: ${turf.vendorId} → Tournament ID: ${tournament.id} → Notification Recipient ID: ${turf.vendorId}`);
          notifyInBackground({
            recipientId: turf.vendorId,
            recipientRole: 'vendor',
            title: notifTitle,
            body: notifBody,
            type: 'tournament',
            data: {
              tournamentId: tournament.id,
              id: tournament.id,
              screen: 'TournamentDetail',
              type: 'tournament',
              action: 'tournament_request',
              turfId: turf.id,
            },
          });
          console.log(`✅ Sent tournament approval FCM notification to vendor ${turf.vendorId}`);
        } catch (notifErr) {
          console.warn('⚠️ Vendor notification trigger error:', notifErr.message);
        }
      }

      const formatted = formatTournament(tournament, req.user);

      return sendSuccess(res, {
        tournament: formatted,
        shareableUrl: formatted.shareableUrl,
        message: shouldPublish
          ? 'Tournament submitted for turf owner approval!'
          : 'Tournament saved as draft',
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

      const requestedStatus =
        status && VALID_STATUSES.includes(status.toLowerCase()) ? status.toLowerCase() : 'draft';
      const dupQuery = {
        creatorType: 'VENDOR',
        ownerId: resolvedVendorId,
        turfId,
        name,
        startDate,
        endDate,
      };
      const dupKey = ['VENDOR', resolvedVendorId, turfId, String(name).trim().toLowerCase(), startDate, endDate].join('|');

      const sendExisting = async (existing) => {
        let t = existing;
        // Retry of "Create & Publish" after the first attempt saved a draft -> publish it
        if (requestedStatus === 'published' && t.status === 'draft') {
          t = await prisma.tournament.update({
            where: { id: t.id },
            data: { status: 'published' },
            include: { turf: { select: { id: true, name: true, city: true, images: true, logo: true, location: true } } },
          });
        }
        return sendSuccess(res, { tournament: formatTournament(t, req.user), duplicate: true }, 200);
      };

      const locked = await withCreateLock(dupKey, async () => {
        const existing = await findRecentDuplicate(dupQuery);
        if (existing) return { existing };

        const shareableIdentifier = generateShareableIdentifier();
        const created = await prisma.tournament.create({
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
        return { created };
      });

      if (locked.waited) {
        const existing = await findRecentDuplicate(dupQuery);
        if (existing) return sendExisting(existing);
      } else if (locked.value?.existing) {
        return sendExisting(locked.value.existing);
      }
      const newTournament = locked.value?.created;
      if (!newTournament) {
        return sendError(res, 'Failed to create tournament', 500, 'CREATE_TOURNAMENT_FAILED');
      }

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
      const isTurfOwner = existing.turfId
        ? await prisma.turf.findFirst({ where: { id: existing.turfId, vendorId: currentUserId } })
        : null;
      const isOwner = Boolean(
        (existing.userId && existing.userId === currentUserId) ||
        (existing.vendorId && existing.vendorId === currentUserId) ||
        isTurfOwner
      );

      if (!isOwner && !isAdmin) {
        return sendError(res, 'Access denied: You cannot publish this tournament', 403, 'FORBIDDEN');
      }

      const shareableIdentifier = existing.shareableIdentifier || generateShareableIdentifier();
      const isUserCreated = existing.creatorType === 'USER' || Boolean(existing.userId);
      const newStatus = isUserCreated ? 'pending_approval' : 'published';
      const newApprovalStatus = isUserCreated ? 'pending' : 'approved';

      const published = await prisma.tournament.update({
        where: { id },
        data: {
          status: newStatus,
          approvalStatus: newApprovalStatus,
          shareableIdentifier,
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true, images: true, logo: true, location: true, vendorId: true },
          },
          user: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
      });

      if (isUserCreated && published.turf?.vendorId) {
        const creatorName = published.user?.name || existing.user?.name || req.user?.name || 'A user';
        const turfName = published.turf?.name || 'your turf';
        console.log(`[Tournament Request Trace] User ID: ${published.userId} → Turf ID: ${published.turfId} → Vendor ID: ${published.turf.vendorId} → Tournament ID: ${published.id} → Notification Recipient ID: ${published.turf.vendorId}`);
        notifyInBackground({
          recipientId: published.turf.vendorId,
          recipientRole: 'vendor',
          title: '🏆 Tournament Request Received',
          body: `${creatorName} requested to conduct "${published.name}" at ${turfName}. Tap to review and approve.`,
          type: 'tournament',
          data: {
            tournamentId: published.id,
            id: published.id,
            screen: 'TournamentDetail',
            type: 'tournament',
            action: 'tournament_request',
            turfId: published.turfId,
          },
        });
      }

      const formatted = formatTournament(published, req.user);

      return sendSuccess(res, {
        tournament: formatted,
        shareableUrl: formatted.shareableUrl,
        shareableIdentifier: formatted.shareableIdentifier,
        message: isUserCreated
          ? 'Tournament submitted for turf owner approval!'
          : 'Tournament published successfully!',
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

  /**
   * POST /api/v1/vendor/tournaments/:id/approve
   * POST /api/v1/tournaments/:id/approve
   * Vendor (turf owner) approves a user-created tournament request
   */
  async approveTournament(req, res) {
    try {
      const id = req.params?.id || req.params?.tournamentId;
      const vendorId = req.vendor?.id || req.user?.id || req.user?.uid || req.user?.vendorId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';

      if (!vendorId && !isAdmin) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          turf: {
            select: { id: true, name: true, city: true, vendorId: true, images: true, logo: true, location: true },
          },
          user: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Verify vendor ownership of the turf
      const isTurfOwner = Boolean(
        vendorId &&
        (tournament.vendorId === vendorId || (tournament.turf && tournament.turf.vendorId === vendorId))
      );

      if (!isTurfOwner && !isAdmin) {
        return sendError(res, 'Access denied: Only the turf owner can approve this tournament', 403, 'FORBIDDEN');
      }

      const shareableIdentifier = tournament.shareableIdentifier || generateShareableIdentifier();

      // Update tournament to published & approved
      const updated = await prisma.tournament.update({
        where: { id },
        data: {
          status: 'published',
          approvalStatus: 'approved',
          rejectionReason: null,
          shareableIdentifier,
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true, vendorId: true, images: true, logo: true, location: true },
          },
          user: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
      });

      // Send FCM notification to creator
      if (tournament.userId) {
        const turfName = tournament.turf?.name || tournament.venueName || 'The turf owner';
        const notifTitle = '🎉 Tournament Approved!';
        const notifBody = `${turfName} approved your tournament "${tournament.name}". It is now live and public!`;
        try {
          notifyInBackground({
            recipientId: tournament.userId,
            recipientRole: 'user',
            title: notifTitle,
            body: notifBody,
            type: 'tournament',
            data: {
              tournamentId: tournament.id,
              id: tournament.id,
              screen: 'TournamentDetail',
              type: 'tournament',
              action: 'tournament_approved',
            },
          });
          console.log(`✅ Sent tournament approval FCM notification to user ${tournament.userId}`);
        } catch (notifErr) {
          console.warn('⚠️ User approval notification error:', notifErr.message);
        }
      }

      const formatted = formatTournament(updated, req.user || req.vendor);

      return sendSuccess(res, {
        tournament: formatted,
        shareableUrl: formatted.shareableUrl,
        message: 'Tournament approved and published successfully!',
      });
    } catch (err) {
      console.error('approveTournament error:', err);
      return sendError(res, 'Failed to approve tournament', 500, 'APPROVE_FAILED');
    }
  },

  /**
   * POST /api/v1/vendor/tournaments/:id/reject
   * POST /api/v1/tournaments/:id/reject
   * Vendor (turf owner) rejects a user-created tournament request with optional reason
   */
  async rejectTournament(req, res) {
    try {
      const id = req.params?.id || req.params?.tournamentId;
      const vendorId = req.vendor?.id || req.user?.id || req.user?.uid || req.user?.vendorId;
      const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      const { reason } = req.body || {};

      if (!vendorId && !isAdmin) {
        return sendError(res, 'Vendor authentication required', 401, 'AUTH_REQUIRED');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          turf: {
            select: { id: true, name: true, city: true, vendorId: true, images: true, logo: true, location: true },
          },
          user: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Verify vendor ownership of the turf
      const isTurfOwner = Boolean(
        vendorId &&
        (tournament.vendorId === vendorId || (tournament.turf && tournament.turf.vendorId === vendorId))
      );

      if (!isTurfOwner && !isAdmin) {
        return sendError(res, 'Access denied: Only the turf owner can reject this tournament', 403, 'FORBIDDEN');
      }

      const rejectionReasonText = reason ? String(reason).trim() : 'Turf is unavailable on the selected dates';

      // Update tournament to rejected
      const updated = await prisma.tournament.update({
        where: { id },
        data: {
          status: 'rejected',
          approvalStatus: 'rejected',
          rejectionReason: rejectionReasonText,
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true, vendorId: true, images: true, logo: true, location: true },
          },
          user: {
            select: { id: true, name: true, avatar: true, phone: true },
          },
        },
      });

      // Send FCM notification to creator
      if (tournament.userId) {
        const turfName = tournament.turf?.name || tournament.venueName || 'The turf owner';
        const notifTitle = 'Tournament Request Declined';
        const notifBody = `${turfName} declined your tournament request "${tournament.name}". Reason: ${rejectionReasonText}`;
        try {
          notifyInBackground({
            recipientId: tournament.userId,
            recipientRole: 'user',
            title: notifTitle,
            body: notifBody,
            type: 'tournament',
            data: {
              tournamentId: tournament.id,
              id: tournament.id,
              screen: 'TournamentDetail',
              type: 'tournament',
              action: 'tournament_rejected',
              reason: rejectionReasonText,
            },
          });
          console.log(`✅ Sent tournament rejection FCM notification to user ${tournament.userId}`);
        } catch (notifErr) {
          console.warn('⚠️ User rejection notification error:', notifErr.message);
        }
      }

      const formatted = formatTournament(updated, req.user || req.vendor);

      return sendSuccess(res, {
        tournament: formatted,
        message: 'Tournament request has been rejected',
      });
    } catch (err) {
      console.error('rejectTournament error:', err);
      return sendError(res, 'Failed to reject tournament', 500, 'REJECT_FAILED');
    }
  },

  /**
   * Helper to build single-elimination knockout bracket from accepted teams
   */
  buildKnockoutBracket(teams, sport = 'Cricket') {
    const N = teams.length;
    if (N < 2) return null;

    let P = 2;
    while (P < N) {
      P *= 2;
    }

    const totalRounds = Math.log2(P);
    const rounds = [];
    const getRoundName = roundNameFor;

    // ── RANDOM DRAW ── teams are shuffled with a secure RNG; pairs are formed from
    // the shuffled order. Byes (when team count is not 2/4/8/16...) are spread
    // evenly and also go to randomly drawn teams. No manual pairing is possible.
    const shuffled = secureShuffle(teams);
    const firstRoundMatches = P / 2;
    const byeCount = P - N;
    const byeMatchIdx = new Set(byeSpreadOrder(firstRoundMatches).slice(0, byeCount));
    const r1Pairs = [];
    let ti = 0;
    for (let m = 0; m < firstRoundMatches; m++) {
      const a1 = shuffled[ti++] || null;
      const b1 = byeMatchIdx.has(m) ? null : (shuffled[ti++] || null);
      r1Pairs.push([a1, b1]);
    }

    let globalMatchCounter = 1;
    for (let r = 1; r <= totalRounds; r++) {
      const roundMatchesCount = P / Math.pow(2, r);
      const roundName = getRoundName(r, totalRounds);
      const isFinalRound = r === totalRounds;
      const matchesInRound = [];

      for (let m = 0; m < roundMatchesCount; m++) {
        const matchId = `match_r${r}_m${m + 1}`;
        const nextRoundIdx = r + 1;
        const nextMatchIdx = Math.floor(m / 2) + 1;
        const nextMatchSlot = (m % 2 === 0) ? 'teamA' : 'teamB';
        const nextMatchId = isFinalRound ? null : `match_r${nextRoundIdx}_m${nextMatchIdx}`;

        let teamA = null;
        let teamB = null;

        if (r === 1) {
          teamA = r1Pairs[m][0];
          teamB = r1Pairs[m][1];
        }

        const isBye = Boolean(r === 1 && teamA && !teamB);
        const isPending = Boolean(teamA && teamB);
        const initialStatus = isBye ? 'completed' : (isPending ? 'pending' : 'waiting');
        const initialWinner = isBye ? teamA : null;

        matchesInRound.push({
          id: matchId,
          roundNumber: r,
          roundName,
          matchNumber: globalMatchCounter++,
          teamA,
          teamB,
          toss: null,
          score: null,
          status: initialStatus,
          winner: initialWinner,
          isBye,
          nextMatchId,
          nextMatchSlot,
        });
      }

      rounds.push({
        roundNumber: r,
        name: roundName,
        matches: matchesInRound,
      });
    }

    // Auto-advance any Round 1 byes to Round 2
    const r1 = rounds[0];
    const r2 = rounds[1];
    if (r2) {
      r1.matches.forEach((m) => {
        if (m.isBye && m.winner && m.nextMatchId) {
          const nextM = r2.matches.find((nm) => nm.id === m.nextMatchId);
          if (nextM) {
            nextM[m.nextMatchSlot] = m.winner;
            if (nextM.teamA && nextM.teamB) {
              nextM.status = 'pending';
            }
          }
        }
      });
    }

    return {
      status: 'in_progress',
      generatedAt: new Date().toISOString(),
      drawType: 'random',
      locked: true,
      teamsCount: N,
      byes: byeCount,
      totalRounds,
      rounds,
      winner: null,
      runnerUp: null,
    };
  },

  /**
   * POST /api/v1/tournaments/:id/bracket/generate
   * Generates single-elimination bracket using ONLY accepted teams
   * Restricted: Tournament Creator ONLY
   */
  async generateBracket(req, res) {
    try {
      const id = (req.params?.id || req.params?.tournamentId || '').trim();
      if (!id) {
        return sendError(res, 'Tournament ID is required', 400, 'MISSING_ID');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          turf: true,
          user: true,
          registrations: true,
        },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Check manager ownership
      const currentUserId = req.user?.id || req.user?.uid;
      const isCreator = Boolean(
        currentUserId && (
          (tournament.creatorType === 'USER' && tournament.userId === currentUserId) ||
          (tournament.creatorType === 'VENDOR' && (tournament.vendorId === currentUserId || (tournament.turf && tournament.turf.vendorId === currentUserId))) ||
          req.user?.role === 'admin' ||
          req.user?.role === 'superadmin'
        )
      );

      if (!isCreator) {
        return sendError(res, 'Access denied: Only the tournament manager (creator) can generate match brackets.', 403, 'FORBIDDEN');
      }

      // The draw is FINAL: once generated nobody (host/vendor) can re-draw or edit pairings.
      const isAdminUser = req.user?.role === 'admin' || req.user?.role === 'superadmin';
      if (tournament.bracket && Array.isArray(tournament.bracket.rounds) && !isAdminUser) {
        return sendError(
          res,
          'The random draw has already been conducted and is locked. Pairings cannot be changed.',
          409,
          'BRACKET_LOCKED'
        );
      }

      // Accepted team registrations ONLY
      const acceptedRegistrations = (tournament.registrations || []).filter(
        (r) => r.status === 'accepted'
      );

      if (acceptedRegistrations.length < 2) {
        return sendError(
          res,
          `At least 2 accepted teams are required to generate tournament matches and brackets. Currently accepted: ${acceptedRegistrations.length} team(s).`,
          400,
          'INSUFFICIENT_TEAMS'
        );
      }

      const teams = acceptedRegistrations.map((r, idx) => ({
        id: r.id,
        teamId: r.id,
        name: r.teamName,
        teamName: r.teamName,
        captainName: r.captainName,
        captainPhone: r.captainPhone,
        players: Array.isArray(r.players) ? r.players : [],
        seed: idx + 1,
      }));

      const bracket = tournamentController.buildKnockoutBracket(teams, tournament.sport);

      const todayStr = new Date().toISOString().slice(0, 10);
      const regEndStr = tournament.registrationEndDate ? String(tournament.registrationEndDate).slice(0, 10) : '';

      const updateData = {
        bracket,
        updatedAt: new Date(),
      };

      // Close registration if still open
      if (req.body?.closeRegistrationNow || !regEndStr || todayStr <= regEndStr) {
        updateData.registrationEndDate = todayStr;
      }

      const updated = await prisma.tournament.update({
        where: { id },
        data: updateData,
        include: {
          turf: true,
          user: true,
          vendor: true,
          registrations: true,
        },
      });

      // Send FCM push notifications to all accepted teams
      const acceptedUserIds = acceptedRegistrations.map((r) => r.userId).filter(Boolean);
      for (const uId of acceptedUserIds) {
        if (uId !== currentUserId) {
          try {
            notifyInBackground({
              recipientId: uId,
              recipientRole: 'user',
              title: '⚡ Tournament Matches Announced!',
              body: `Match fixtures for "${tournament.name}" have been generated. Check out the tournament bracket now!`,
              type: 'tournament',
              data: {
                tournamentId: tournament.id,
                id: tournament.id,
                screen: 'TournamentDetail',
                action: 'bracket_generated',
              },
            });
          } catch (_) { }
        }
      }

      const formatted = formatTournament(updated, req.user || req.vendor);
      return sendSuccess(res, {
        tournament: formatted,
        bracket: formatted.bracket,
        message: `Matches successfully generated for ${teams.length} accepted teams.`,
      });
    } catch (err) {
      console.error('generateBracket error:', err);
      return sendError(res, 'Failed to generate tournament bracket', 500, 'GENERATE_FAILED');
    }
  },

  /**
   * POST /api/v1/tournaments/:id/matches/:matchId/toss
   * Conducts match coin toss
   * Restricted: Tournament Creator ONLY
   */
  async conductMatchToss(req, res) {
    try {
      const id = (req.params?.id || req.params?.tournamentId || '').trim();
      const matchId = (req.params?.matchId || req.body?.matchId || '').trim();
      const { winnerTeamId, decision } = req.body;

      if (!id || !matchId) {
        return sendError(res, 'Tournament ID and Match ID are required', 400, 'MISSING_PARAMS');
      }

      if (!winnerTeamId) {
        return sendError(res, 'Toss winner team is required', 400, 'MISSING_TOSS_WINNER');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { turf: true, user: true, registrations: true },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Creator check
      const currentUserId = req.user?.id || req.user?.uid;
      const isCreator = Boolean(
        currentUserId && (
          (tournament.creatorType === 'USER' && tournament.userId === currentUserId) ||
          (tournament.creatorType === 'VENDOR' && (tournament.vendorId === currentUserId || (tournament.turf && tournament.turf.vendorId === currentUserId))) ||
          req.user?.role === 'admin' ||
          req.user?.role === 'superadmin'
        )
      );

      if (!isCreator) {
        return sendError(res, 'Access denied: Only the tournament manager (creator) can conduct match toss.', 403, 'FORBIDDEN');
      }

      const bracket = tournament.bracket;
      if (!bracket || !Array.isArray(bracket.rounds)) {
        return sendError(res, 'Tournament bracket has not been generated yet', 400, 'NO_BRACKET');
      }

      let targetMatch = null;
      for (const round of bracket.rounds) {
        const found = (round.matches || []).find((m) => m.id === matchId);
        if (found) {
          targetMatch = found;
          break;
        }
      }

      if (!targetMatch) {
        return sendError(res, 'Match not found in tournament bracket', 404, 'MATCH_NOT_FOUND');
      }

      const winningTeamObj = targetMatch.teamA?.id === winnerTeamId
        ? targetMatch.teamA
        : (targetMatch.teamB?.id === winnerTeamId ? targetMatch.teamB : null);

      const winnerName = winningTeamObj?.name || winningTeamObj?.teamName || 'Toss Winner';

      targetMatch.toss = {
        wonBy: winnerTeamId,
        winnerId: winnerTeamId,
        winnerName,
        decision: decision || 'bat',
      };
      targetMatch.status = 'toss';

      const updated = await prisma.tournament.update({
        where: { id },
        data: {
          bracket,
          updatedAt: new Date(),
        },
        include: { turf: true, user: true, registrations: true },
      });

      const formatted = formatTournament(updated, req.user || req.vendor);
      return sendSuccess(res, {
        tournament: formatted,
        match: targetMatch,
        message: `Toss recorded: ${winnerName} won the toss and elected to ${decision || 'bat'}.`,
      });
    } catch (err) {
      console.error('conductMatchToss error:', err);
      return sendError(res, 'Failed to record toss result', 500, 'TOSS_FAILED');
    }
  },

  /**
   * POST /api/v1/tournaments/:id/matches/:matchId/score
   * Enters or updates match score
   * Restricted: Tournament Creator ONLY
   */
  async updateMatchScore(req, res) {
    try {
      const id = (req.params?.id || req.params?.tournamentId || '').trim();
      const matchId = (req.params?.matchId || req.body?.matchId || '').trim();
      const { score, status } = req.body;

      if (!id || !matchId) {
        return sendError(res, 'Tournament ID and Match ID are required', 400, 'MISSING_PARAMS');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { turf: true, user: true, registrations: true },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Creator check
      const currentUserId = req.user?.id || req.user?.uid;
      const isCreator = Boolean(
        currentUserId && (
          (tournament.creatorType === 'USER' && tournament.userId === currentUserId) ||
          (tournament.creatorType === 'VENDOR' && (tournament.vendorId === currentUserId || (tournament.turf && tournament.turf.vendorId === currentUserId))) ||
          req.user?.role === 'admin' ||
          req.user?.role === 'superadmin'
        )
      );

      if (!isCreator) {
        return sendError(res, 'Access denied: Only the tournament manager (creator) can enter scores.', 403, 'FORBIDDEN');
      }

      const bracket = tournament.bracket;
      if (!bracket || !Array.isArray(bracket.rounds)) {
        return sendError(res, 'Tournament bracket has not been generated yet', 400, 'NO_BRACKET');
      }

      let targetMatch = null;
      for (const round of bracket.rounds) {
        const found = (round.matches || []).find((m) => m.id === matchId);
        if (found) {
          targetMatch = found;
          break;
        }
      }

      if (!targetMatch) {
        return sendError(res, 'Match not found in tournament bracket', 404, 'MATCH_NOT_FOUND');
      }

      if (!targetMatch.teamA || !targetMatch.teamB) {
        return sendError(res, 'Both teams must be decided before entering a score.', 400, 'MATCH_NOT_READY');
      }
      if (targetMatch.status === 'completed' && !(req.user?.role === 'admin' || req.user?.role === 'superadmin')) {
        return sendError(res, 'This match is completed and its result is locked.', 409, 'MATCH_LOCKED');
      }

      if (score) {
        // Keep only the fields the apps use; stops arbitrary/huge JSON being stored in the bracket
        targetMatch.score = {
          teamA: String(score.teamA ?? '').slice(0, 40),
          teamB: String(score.teamB ?? '').slice(0, 40),
          summary: String(score.summary ?? '').slice(0, 300),
          updatedAt: new Date().toISOString(),
        };
      }
      if (status) {
        targetMatch.status = status;
      } else if (!targetMatch.status || targetMatch.status === 'pending' || targetMatch.status === 'toss') {
        targetMatch.status = 'live';
      }

      const updated = await prisma.tournament.update({
        where: { id },
        data: {
          bracket,
          updatedAt: new Date(),
        },
        include: { turf: true, user: true, registrations: true },
      });

      const formatted = formatTournament(updated, req.user || req.vendor);
      return sendSuccess(res, {
        tournament: formatted,
        match: targetMatch,
        message: 'Match score updated successfully.',
      });
    } catch (err) {
      console.error('updateMatchScore error:', err);
      return sendError(res, 'Failed to update match score', 500, 'SCORE_UPDATE_FAILED');
    }
  },

  /**
   * POST /api/v1/tournaments/:id/matches/:matchId/winner
   * Confirms winner, advances to next round, or declares champion
   * Restricted: Tournament Creator ONLY
   */
  async confirmMatchWinner(req, res) {
    try {
      const id = (req.params?.id || req.params?.tournamentId || '').trim();
      const matchId = (req.params?.matchId || req.body?.matchId || '').trim();
      const { winnerTeamId: requestedWinnerId, tiebreakNote } = req.body;

      if (!id || !matchId) {
        return sendError(res, 'Tournament ID and Match ID are required', 400, 'MISSING_PARAMS');
      }

      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: { turf: true, user: true, registrations: true },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      // Creator check
      const currentUserId = req.user?.id || req.user?.uid;
      const isCreator = Boolean(
        currentUserId && (
          (tournament.creatorType === 'USER' && tournament.userId === currentUserId) ||
          (tournament.creatorType === 'VENDOR' && (tournament.vendorId === currentUserId || (tournament.turf && tournament.turf.vendorId === currentUserId))) ||
          req.user?.role === 'admin' ||
          req.user?.role === 'superadmin'
        )
      );

      if (!isCreator) {
        return sendError(res, 'Access denied: Only the tournament manager (creator) can advance winners and declare champions.', 403, 'FORBIDDEN');
      }

      const bracket = tournament.bracket;
      if (!bracket || !Array.isArray(bracket.rounds)) {
        return sendError(res, 'Tournament bracket has not been generated yet', 400, 'NO_BRACKET');
      }

      let targetMatch = null;
      for (const round of bracket.rounds) {
        const found = (round.matches || []).find((m) => m.id === matchId);
        if (found) {
          targetMatch = found;
          break;
        }
      }

      if (!targetMatch) {
        return sendError(res, 'Match not found in tournament bracket', 404, 'MATCH_NOT_FOUND');
      }

      if (!targetMatch.teamA || !targetMatch.teamB) {
        return sendError(res, 'Both teams must be decided before finishing a match.', 400, 'MATCH_NOT_READY');
      }
      if (targetMatch.status === 'completed') {
        return sendError(res, 'This match is already completed and locked.', 409, 'MATCH_LOCKED');
      }

      // ── SCORE-BASED RESULT ── the winner is decided by the entered score.
      const scoreA = parseScoreValue(targetMatch.score?.teamA);
      const scoreB = parseScoreValue(targetMatch.score?.teamB);
      if (scoreA === null || scoreB === null) {
        return sendError(res, 'Enter the score of both teams before finishing the match.', 400, 'SCORE_REQUIRED');
      }

      let winnerTeamId;
      let decidedBy = 'score';
      if (scoreA !== scoreB) {
        winnerTeamId = scoreA > scoreB ? targetMatch.teamA.id : targetMatch.teamB.id;
        if (requestedWinnerId && requestedWinnerId !== winnerTeamId) {
          return sendError(res, 'Winner does not match the entered score. Correct the score first.', 400, 'WINNER_SCORE_MISMATCH');
        }
      } else {
        // Scores level: a tie-breaker (penalties / super over / golden goal) result is required
        if (!requestedWinnerId) {
          return sendError(res, 'Scores are tied. Select the tie-breaker winner (penalties / super over).', 400, 'TIE_NEEDS_TIEBREAK');
        }
        winnerTeamId = requestedWinnerId;
        decidedBy = 'tiebreak';
      }

      const winningTeamObj = targetMatch.teamA?.id === winnerTeamId
        ? targetMatch.teamA
        : (targetMatch.teamB?.id === winnerTeamId ? targetMatch.teamB : null);

      if (!winningTeamObj) {
        return sendError(res, 'Invalid winner team: specified team is not in this match.', 400, 'INVALID_WINNER');
      }
      const losingTeamObj = winningTeamObj.id === targetMatch.teamA.id ? targetMatch.teamB : targetMatch.teamA;

      targetMatch.winner = winningTeamObj;
      targetMatch.loser = losingTeamObj;
      targetMatch.decidedBy = decidedBy;
      if (decidedBy === 'tiebreak' && tiebreakNote) {
        targetMatch.score = { ...(targetMatch.score || {}), tiebreak: String(tiebreakNote).slice(0, 120) };
      }
      targetMatch.completedAt = new Date().toISOString();
      targetMatch.status = 'completed';

      let isTournamentFinal = false;

      // Advance winner to next round match if one exists
      if (targetMatch.nextMatchId) {
        for (const round of bracket.rounds) {
          const nextMatch = (round.matches || []).find((m) => m.id === targetMatch.nextMatchId);
          if (nextMatch) {
            nextMatch[targetMatch.nextMatchSlot] = winningTeamObj;
            if (nextMatch.teamA && nextMatch.teamB) {
              nextMatch.status = 'pending';
            }
            break;
          }
        }
      } else {
        // This is the FINAL match!
        isTournamentFinal = true;
        bracket.winner = winningTeamObj;
        bracket.runnerUp = losingTeamObj;
        bracket.status = 'completed';
      }

      const updated = await prisma.tournament.update({
        where: { id },
        data: {
          bracket,
          updatedAt: new Date(),
        },
        include: { turf: true, user: true, registrations: true },
      });

      // Send FCM notification for match winner / champion
      const winnerName = winningTeamObj.name || winningTeamObj.teamName;
      const notifTitle = isTournamentFinal ? '👑 Tournament Champion Declared!' : '🏆 Match Winner Advanced!';
      const notifBody = isTournamentFinal
        ? `${winnerName} has won the championship in "${tournament.name}"!`
        : `${winnerName} won ${targetMatch.roundName || 'their match'} and advanced to the next round in "${tournament.name}"!`;

      // Notify accepted participants
      const acceptedUserIds = (tournament.registrations || [])
        .filter((r) => r.status === 'accepted')
        .map((r) => r.userId)
        .filter(Boolean);

      for (const uId of acceptedUserIds) {
        try {
          notifyInBackground({
            recipientId: uId,
            recipientRole: 'user',
            title: notifTitle,
            body: notifBody,
            type: 'tournament',
            data: {
              tournamentId: tournament.id,
              id: tournament.id,
              screen: 'TournamentDetail',
              action: isTournamentFinal ? 'champion_declared' : 'match_won',
            },
          });
        } catch (_) { }
      }

      const formatted = formatTournament(updated, req.user || req.vendor);
      return sendSuccess(res, {
        tournament: formatted,
        bracket: formatted.bracket,
        winner: winningTeamObj,
        isTournamentFinal,
        message: isTournamentFinal
          ? `${winnerName} declared Tournament Champion! 👑`
          : `${winnerName} advanced to the next round! 🏆`,
      });
    } catch (err) {
      console.error('confirmMatchWinner error:', err);
      return sendError(res, 'Failed to confirm match winner', 500, 'WINNER_CONFIRM_FAILED');
    }
  },
};

module.exports = tournamentController;
