const prisma = require('../config/prisma');
const { sendSuccess, sendError } = require('../utils/response');

const VALID_STATUSES = ['draft', 'published', 'ongoing', 'completed', 'cancelled'];
const VALID_FORMATS = ['knockout', 'round_robin', 'group_knockout', 'double_elimination', 'league'];

function validateDateStrings(start, end) {
  if (!start || !end) return false;
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  return !isNaN(s) && !isNaN(e) && s <= e;
}

const tournamentController = {
  /**
   * GET /api/v1/admin/tournaments
   * Retrieve list of tournaments with filtering, search, and KPI aggregation
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
        },
        orderBy: [
          { createdAt: 'desc' },
        ],
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
        tournaments,
        total: tournaments.length,
        stats,
      });
    } catch (err) {
      console.error('Error fetching tournaments:', err);
      return sendError(res, err.message || 'Failed to fetch tournaments', 500, 'FETCH_TOURNAMENTS_FAILED');
    }
  },

  /**
   * GET /api/v1/admin/tournaments/:id
   * Get single tournament with complete details and turf relation
   */
  async getTournamentById(req, res) {
    try {
      const { id } = req.params;
      const tournament = await prisma.tournament.findUnique({
        where: { id },
        include: {
          turf: {
            select: {
              id: true,
              name: true,
              city: true,
              location: true,
              images: true,
              pricePerHour: true,
            },
          },
        },
      });

      if (!tournament) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

      return sendSuccess(res, { tournament });
    } catch (err) {
      console.error('Error fetching tournament detail:', err);
      return sendError(res, err.message || 'Failed to fetch tournament detail', 500, 'FETCH_FAILED');
    }
  },

  /**
   * POST /api/v1/admin/tournaments
   * Create a new tournament
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

      // Validation
      const errors = {};
      if (!name || !name.trim()) errors.name = 'Tournament name is required';
      if (!sport || !sport.trim()) errors.sport = 'Sport type is required';
      if (!startDate) errors.startDate = 'Tournament start date is required';
      if (!endDate) errors.endDate = 'Tournament end date is required';
      if (!registrationStartDate) errors.registrationStartDate = 'Registration start date is required';
      if (!registrationEndDate) errors.registrationEndDate = 'Registration end date is required';

      // Date range validation
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

      const numEntryFee = entryFee !== undefined && entryFee !== '' ? Number(entryFee) : 0;
      if (isNaN(numEntryFee) || numEntryFee < 0) {
        errors.entryFee = 'Entry fee must be a valid non-negative number';
      }

      const numCapacity = participantCapacity ? parseInt(participantCapacity, 10) : 16;
      if (isNaN(numCapacity) || numCapacity < 2) {
        errors.participantCapacity = 'Participant capacity must be at least 2';
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      // Check linked turf if provided
      let resolvedVenue = venueName ? venueName.trim() : '';
      let resolvedCity = city ? city.trim() : '';
      let vendorId = null;

      if (turfId) {
        const turf = await prisma.turf.findUnique({
          where: { id: turfId },
          select: { id: true, name: true, city: true, vendorId: true },
        });
        if (turf) {
          if (!resolvedVenue) resolvedVenue = turf.name;
          if (!resolvedCity) resolvedCity = turf.city || '';
          vendorId = turf.vendorId;
        }
      }

      if (!resolvedVenue) {
        resolvedVenue = 'Main Arena / Ground';
      }

      const tournamentId = `tourn_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const newTournament = await prisma.tournament.create({
        data: {
          id: tournamentId,
          name: name.trim(),
          description: description ? description.trim() : null,
          sport: sport.trim(),
          turfId: turfId || null,
          vendorId: vendorId || null,
          venueName: resolvedVenue,
          city: resolvedCity || null,
          venueLocation: venueLocation || null,
          startDate: String(startDate).slice(0, 32),
          endDate: String(endDate).slice(0, 32),
          registrationStartDate: String(registrationStartDate).slice(0, 32),
          registrationEndDate: String(registrationEndDate).slice(0, 32),
          entryFee: numEntryFee,
          prizePool: prizePool !== undefined && prizePool !== '' ? Number(prizePool) : 0,
          prizeDetails: prizeDetails || null,
          participantCapacity: numCapacity,
          format: format ? String(format).trim().toLowerCase() : 'knockout',
          rules: rules ? rules.trim() : null,
          bannerUrl: bannerUrl ? bannerUrl.trim() : null,
          status: status && VALID_STATUSES.includes(status.toLowerCase()) ? status.toLowerCase() : 'draft',
          currentParticipantsCount: 0,
          contactPhone: contactPhone ? contactPhone.trim() : null,
          contactEmail: contactEmail ? contactEmail.trim().toLowerCase() : null,
          createdBy: req.user?.uid || 'superadmin',
        },
        include: {
          turf: {
            select: { id: true, name: true, city: true },
          },
        },
      });

      return sendSuccess(res, { tournament: newTournament }, 201);
    } catch (err) {
      console.error('Error creating tournament:', err);
      return sendError(res, err.message || 'Failed to create tournament', 500, 'CREATE_TOURNAMENT_FAILED');
    }
  },

  /**
   * PUT /api/v1/admin/tournaments/:id
   * Update tournament information
   */
  async updateTournament(req, res) {
    try {
      const { id } = req.params;
      const existing = await prisma.tournament.findUnique({
        where: { id },
      });

      if (!existing) {
        return sendError(res, 'Tournament not found', 404, 'NOT_FOUND');
      }

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
      if (name !== undefined && !name.trim()) errors.name = 'Tournament name cannot be empty';
      if (sport !== undefined && !sport.trim()) errors.sport = 'Sport type cannot be empty';

      const sDate = startDate !== undefined ? startDate : existing.startDate;
      const eDate = endDate !== undefined ? endDate : existing.endDate;
      const rSDate = registrationStartDate !== undefined ? registrationStartDate : existing.registrationStartDate;
      const rEDate = registrationEndDate !== undefined ? registrationEndDate : existing.registrationEndDate;

      if (sDate && eDate && !validateDateStrings(sDate, eDate)) {
        errors.dateRange = 'Tournament end date must be on or after start date';
      }
      if (rSDate && rEDate && !validateDateStrings(rSDate, rEDate)) {
        errors.regDateRange = 'Registration end date must be on or after registration start date';
      }
      if (rEDate && sDate) {
        const regEnd = new Date(rEDate).getTime();
        const tStart = new Date(sDate).getTime();
        if (regEnd > tStart) {
          errors.regDeadline = 'Registration deadline cannot be after tournament start date';
        }
      }

      if (entryFee !== undefined && (isNaN(Number(entryFee)) || Number(entryFee) < 0)) {
        errors.entryFee = 'Entry fee must be a valid non-negative number';
      }
      if (participantCapacity !== undefined && (isNaN(parseInt(participantCapacity, 10)) || parseInt(participantCapacity, 10) < 2)) {
        errors.participantCapacity = 'Participant capacity must be at least 2';
      }

      if (Object.keys(errors).length > 0) {
        return sendError(res, Object.values(errors)[0], 400, 'VALIDATION_ERROR', errors);
      }

      const updateData = {};
      if (name !== undefined) updateData.name = name.trim();
      if (description !== undefined) updateData.description = description ? description.trim() : null;
      if (sport !== undefined) updateData.sport = sport.trim();
      if (turfId !== undefined) {
        updateData.turfId = turfId || null;
        if (turfId) {
          const turf = await prisma.turf.findUnique({
            where: { id: turfId },
            select: { vendorId: true },
          });
          if (turf) updateData.vendorId = turf.vendorId;
        } else {
          updateData.vendorId = null;
        }
      }
      if (venueName !== undefined) updateData.venueName = venueName ? venueName.trim() : existing.venueName;
      if (city !== undefined) updateData.city = city ? city.trim() : null;
      if (venueLocation !== undefined) updateData.venueLocation = venueLocation || null;
      if (startDate !== undefined) updateData.startDate = String(startDate).slice(0, 32);
      if (endDate !== undefined) updateData.endDate = String(endDate).slice(0, 32);
      if (registrationStartDate !== undefined) updateData.registrationStartDate = String(registrationStartDate).slice(0, 32);
      if (registrationEndDate !== undefined) updateData.registrationEndDate = String(registrationEndDate).slice(0, 32);
      if (entryFee !== undefined) updateData.entryFee = Number(entryFee);
      if (prizePool !== undefined) updateData.prizePool = prizePool !== '' ? Number(prizePool) : 0;
      if (prizeDetails !== undefined) updateData.prizeDetails = prizeDetails || null;
      if (participantCapacity !== undefined) updateData.participantCapacity = parseInt(participantCapacity, 10);
      if (format !== undefined) updateData.format = String(format).trim().toLowerCase();
      if (rules !== undefined) updateData.rules = rules ? rules.trim() : null;
      if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl ? bannerUrl.trim() : null;
      if (status !== undefined && VALID_STATUSES.includes(status.toLowerCase())) {
        updateData.status = status.toLowerCase();
      }
      if (contactPhone !== undefined) updateData.contactPhone = contactPhone ? contactPhone.trim() : null;
      if (contactEmail !== undefined) updateData.contactEmail = contactEmail ? contactEmail.trim().toLowerCase() : null;

      const updated = await prisma.tournament.update({
        where: { id },
        data: updateData,
        include: {
          turf: {
            select: { id: true, name: true, city: true },
          },
        },
      });

      return sendSuccess(res, { tournament: updated });
    } catch (err) {
      console.error('Error updating tournament:', err);
      return sendError(res, err.message || 'Failed to update tournament', 500, 'UPDATE_FAILED');
    }
  },

  /**
   * PATCH /api/v1/admin/tournaments/:id/status
   * Update status (draft, published, ongoing, completed, cancelled)
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
        },
      });

      return sendSuccess(res, {
        tournament: updated,
        message: `Tournament status updated to ${status}`,
      });
    } catch (err) {
      console.error('Error updating tournament status:', err);
      return sendError(res, err.message || 'Failed to update status', 500, 'STATUS_UPDATE_FAILED');
    }
  },

  /**
   * DELETE /api/v1/admin/tournaments/:id
   * Safeguarded tournament deletion
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
};

module.exports = tournamentController;
