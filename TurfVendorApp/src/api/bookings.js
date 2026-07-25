import { apiRequest } from './client';

export const getBookingsApi = (turfId) =>
  apiRequest(turfId ? `/vendor/bookings?turfId=${turfId}` : '/vendor/bookings');

export const getBookingDetailApi = (id) => apiRequest(`/vendor/bookings/${id}`);

export const acceptBookingApi = (id) =>
  apiRequest(`/vendor/bookings/${id}/accept`, { method: 'PUT' });

export const rejectBookingApi = (id, reason) =>
  apiRequest(`/vendor/bookings/${id}/reject`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  });