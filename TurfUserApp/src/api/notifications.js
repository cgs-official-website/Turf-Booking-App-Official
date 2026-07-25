// src/api/notifications.js
import { client } from './client';

export const notificationsApi = {
  // GET /api/notifications?type=&read=
  getAll:     (params = {}) => {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}=${v}`)
      .join('&');
    return client.get(`/notifications${qs ? `?${qs}` : ''}`);
  },
  // PATCH /api/notifications/:id/read
  markRead:   (id)  => client.patch(`/notifications/${id}/read`),
  // PATCH /api/notifications/read-all
  markAllRead: ()   => client.patch('/notifications/read-all'),
};