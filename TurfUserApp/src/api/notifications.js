// src/api/notifications.js
import { client } from './client';

export const notificationsApi = {
  // GET /api/v1/notifications
  getAll: (params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return client.get(`/notifications${qs ? `?${qs}` : ''}`);
  },

  // POST /api/v1/notifications/register-token
  registerToken: (token) => client.post('/notifications/register-token', { token }),

  // POST /api/v1/notifications/remove-token
  removeToken: (token) => client.post('/notifications/remove-token', { token }),

  // PATCH /api/v1/notifications/:id/read
  markRead: (id) => client.patch(`/notifications/${id}/read`),

  // PATCH /api/v1/notifications/read-all
  markAllRead: () => client.patch('/notifications/read-all'),
};