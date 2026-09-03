// src/api/bookings.js
import { client } from './client';

export const bookingsApi = {
  // POST /api/v1/bookings/reserve
  reserve: (data) => client.post('/bookings/reserve', data),

  // Fallback alias for backward compatibility
  create: (data) => client.post('/bookings/reserve', data),

  // GET /api/v1/bookings/mine?status=
  getMyBookings: (status, cursor) => {
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (cursor) params.set('cursor', cursor);
    const qs = params.toString();
    return client.get(`/bookings/mine${qs ? `?${qs}` : ''}`);
  },

  // GET /api/v1/bookings/:id
  getBooking: (id) => client.get(`/bookings/${id}`),

  // POST /api/v1/bookings/:id/create-order
  createPaymentOrder: (id) => client.post(`/bookings/${id}/create-order`),

  // POST /api/v1/bookings/:id/confirm-cash
  confirmCash: (id) => client.post(`/bookings/${id}/confirm-cash`),

  // POST /api/v1/bookings/:id/cancel
  cancel: (id, reason) => client.post(`/bookings/${id}/cancel`, { reason }),

  // POST /api/v1/bookings/:id/review
  addReview: (id, data) => client.post(`/bookings/${id}/review`, data),
};