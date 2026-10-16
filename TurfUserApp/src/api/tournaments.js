import { client } from './client';

/**
 * Fetch all published & active tournaments hosted by turfs
 * (Available Tab)
 */
export const getAvailableTournamentsApi = () => {
  return client.get('/tournaments/available');
};

/**
 * Fetch all tournaments created by the current authenticated user
 * (My Tournaments Tab)
 */
export const getMyTournamentsApi = () => {
  return client.get('/tournaments/my');
};

/**
 * Fetch single tournament details by ID
 */
export const getTournamentByIdApi = (id) => {
  return client.get(`/tournaments/${id}`);
};

/**
 * Create a new user tournament (draft or published)
 */
export const createUserTournamentApi = (data) => {
  return client.post('/tournaments', data);
};

/**
 * Update user's own tournament
 */
export const updateTournamentApi = (id, data) => {
  return client.put(`/tournaments/${id}`, data);
};

/**
 * Publish a user's draft tournament
 */
export const publishTournamentApi = (id) => {
  return client.post(`/tournaments/${id}/publish`);
};

/**
 * Cancel a user's tournament
 */
export const cancelTournamentApi = (id) => {
  return client.post(`/tournaments/${id}/cancel`);
};

/**
 * Resolve public shared tournament by its shareable identifier
 */
export const getPublicTournamentByShareIdApi = (shareIdentifier) => {
  return client.get(`/tournaments/share/${shareIdentifier}`);
};

/**
 * Register a team for a tournament
 */
export const registerTournamentTeamApi = (tournamentId, data) => {
  return client.post(`/tournaments/${tournamentId}/register`, data);
};

/**
 * Fetch current user's registration for a tournament
 */
export const getMyTournamentRegistrationApi = (tournamentId) => {
  return client.get(`/tournaments/${tournamentId}/my-registration`);
};

