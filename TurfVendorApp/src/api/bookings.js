import { apiRequest } from './client';

export const getBookingsApi = (turfId) =>
  apiRequest(turfId ? `/vendor/bookings?turfId=${turfId}` : '/vendor/bookings');

export const getBookingDetailApi = (id) => apiRequest(`/vendor/bookings/${id}`);

export const acceptBookingApi = (id) =>
  apiRequest(`/vendor/bookings/${id}/accept`, {
    method: 'POST',
    body: JSON.stringify({ action: 'accept' }),
  });

export const rejectBookingApi = (id, reason) =>
  apiRequest(`/vendor/bookings/${id}/reject`, {
    method: 'POST',
    body: JSON.stringify({ action: 'reject', reason: reason || 'Slot unavailable' }),
  });