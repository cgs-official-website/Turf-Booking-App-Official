import { apiRequest } from './client';

// GET /api/vendor/reviews -> { reviews, ratingSummary }
export const getMyReviewsApi = () => apiRequest('/vendor/reviews');

// PATCH /api/vendor/reviews/:id/hide -> { review }
export const toggleReviewVisibilityApi = (id) =>
  apiRequest(`/vendor/reviews/${id}/hide`, { method: 'PATCH' });

// DELETE /api/vendor/reviews/:id
export const deleteReviewApi = (id) =>
  apiRequest(`/vendor/reviews/${id}`, { method: 'DELETE' });