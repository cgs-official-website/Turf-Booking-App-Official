import { apiRequest } from './client';

/**
 * Fetch all tournaments for the logged-in vendor (optionally filtered by turfId)
 */
export const getTournamentsApi = (turfId) => {
  const url = turfId ? `/vendor/turfs/${turfId}/tournaments` : '/vendor/tournaments';
  return apiRequest(url);
};

/**
 * Fetch a specific tournament by its ID
 */
export const getTournamentByIdApi = (tournamentId) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}`);
};

/**
 * Create a new tournament for a turf
 */
export const createTournamentApi = (data) => {
  return apiRequest('/vendor/tournaments', {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Update an existing tournament
 */
export const updateTournamentApi = (tournamentId, data) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

/**
 * Publish a draft tournament
 */
export const publishTournamentApi = (tournamentId) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/publish`, {
    method: 'POST',
  });
};

/**
 * Fetch all registrations for a tournament (VendorApp)
 */
export const getTournamentRegistrationsApi = (tournamentId) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/registrations`);
};

/**
 * Accept a team registration (atomic slot verification)
 */
export const acceptRegistrationApi = (tournamentId, registrationId) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/registrations/${registrationId}/accept`, {
    method: 'POST',
  });
};

/**
 * Reject a team registration with optional reason
 */
export const rejectRegistrationApi = (tournamentId, registrationId, reason) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/registrations/${registrationId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};

/**
 * Vendor approves a user-created tournament request
 */
export const approveTournamentApi = (tournamentId) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/approve`, {
    method: 'POST',
  });
};

/**
 * Vendor rejects a user-created tournament request with reason
 */
export const rejectTournamentApi = (tournamentId, reason) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/reject`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
};


/**
 * Generate knockout bracket from ACCEPTED teams (vendor who created the tournament only)
 */
export const generateBracketApi = (tournamentId, data = {}) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/bracket/generate`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Record coin toss for a match
 */
export const conductMatchTossApi = (tournamentId, matchId, data) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/matches/${matchId}/toss`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Enter / update live score of a match: { score: { teamA, teamB, summary }, status }
 */
export const updateMatchScoreApi = (tournamentId, matchId, data) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/matches/${matchId}/score`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};

/**
 * Confirm match winner, advance to next round (or crown champion on the final)
 */
export const confirmMatchWinnerApi = (tournamentId, matchId, data) => {
  return apiRequest(`/vendor/tournaments/${tournamentId}/matches/${matchId}/winner`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
};
