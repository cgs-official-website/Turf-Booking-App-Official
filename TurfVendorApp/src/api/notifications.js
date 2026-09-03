// src/api/notifications.js
import { apiRequest } from './client';

export const notificationsApi = {
  // POST /api/v1/notifications/register-token
  registerToken: (token) =>
    apiRequest('/notifications/register-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // POST /api/v1/notifications/remove-token
  removeToken: (token) =>
    apiRequest('/notifications/remove-token', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

  // GET /api/v1/notifications
  getAll: () => apiRequest('/notifications', { method: 'GET' }),

  // PATCH /api/v1/notifications/:id/read
  markRead: (id) =>
    apiRequest(`/notifications/${id}/read`, {
      method: 'PATCH',
    }),
};
