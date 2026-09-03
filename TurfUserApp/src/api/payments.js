// src/api/payments.js
import { client } from './client';

export const paymentsApi = {
  // POST /api/v1/payments/verify
  verifyPayment: (data) => client.post('/payments/verify', data),

  // Alias
  verify: (data) => client.post('/payments/verify', data),
};