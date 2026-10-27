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

  // PATCH /api/v1/notifications/read-all
  markAllRead: () =>
    apiRequest('/notifications/read-all', {
      method: 'PATCH',
    }),

  // GET /api/v1/notifications/push-status  |  POST /api/v1/notifications/test-push
  pushStatus: () => apiRequest('/notifications/push-status', { method: 'GET' }),
  testPush: () => apiRequest('/notifications/test-push', { method: 'POST', body: JSON.stringify({}) }),

  // GET /api/v1/notifications/preferences
  getPreferences: () => apiRequest('/notifications/preferences', { method: 'GET' }),

  // PUT /api/v1/notifications/preferences
  updatePreferences: (pushNotifications) =>
    apiRequest('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify({ pushNotifications }),
    }),
};
