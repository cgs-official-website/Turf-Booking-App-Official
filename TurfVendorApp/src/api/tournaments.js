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
