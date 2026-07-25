// // src/api/bookings.js
// import { client } from './client';

// export const bookingsApi = {
//   // POST /api/bookings  →  { turfId, sport, date, startTime, endTime, players }
//   create:       (data)    => client.post('/bookings', data),
//   // GET  /api/bookings?status=
//   getMyBookings:(status)  => client.get(`/bookings${status ? `?status=${status}` : ''}`),
//   // GET  /api/bookings/:id
//   getBooking:   (id)      => client.get(`/bookings/${id}`),
//   // PATCH /api/bookings/:id/cancel
//   cancel:       (id, reason) => client.patch(`/bookings/${id}/cancel`, { reason }),
//   // POST /api/bookings/:id/review
//   addReview:    (id, data) => client.post(`/bookings/${id}/review`, data),
// };

// src/api/bookings.js
import { client } from './client';

export const bookingsApi = {
  // POST /api/bookings
  create:             (data)         => client.post('/bookings', data),
  // GET  /api/bookings?status=
  getMyBookings:      (status)       => client.get(`/bookings${status ? `?status=${status}` : ''}`),
  // GET  /api/bookings/:id
  getBooking:         (id)           => client.get(`/bookings/${id}`),
  // PATCH /api/bookings/:id/cancel
  cancel:             (id, reason)   => client.patch(`/bookings/${id}/cancel`, { reason }),
  // POST /api/bookings/:id/review
  addReview:          (id, data)     => client.post(`/bookings/${id}/review`, data),

  // ── Payment ──────────────────────────────────────────────────────────────
  // POST /api/bookings/:id/payment-order  →  { orderId, amount, currency, razorpayKeyId }
  createPaymentOrder: (id)           => client.post(`/bookings/${id}/payment-order`),
  // POST /api/bookings/:id/verify-payment →  { razorpayPaymentId, razorpayOrderId, razorpaySignature }
  verifyPayment:      (id, data)     => client.post(`/bookings/${id}/verify-payment`, data),
};