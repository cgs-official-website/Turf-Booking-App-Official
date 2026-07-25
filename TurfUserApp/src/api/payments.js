// src/api/payments.js
import { client } from './client';

export const paymentsApi = {
  // POST /api/payments/create-order  →  { bookingId }
  createOrder: (bookingId) => client.post('/payments/create-order', { bookingId }),
  // POST /api/payments/verify
  verify: (data) => client.post('/payments/verify', data),
};