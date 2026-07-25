// // src/api/auth.js
// import { client } from './client';

// export const authApi = {
//   login:          (email, password) => client.post('/auth/login', { email, password }),
//   register:       (data)            => client.post('/auth/register', data),
//   getMe:          ()                => client.get('/auth/me'),
//   updateMe:       (data)            => client.put('/auth/me', data),
//   changePassword: (data)            => client.put('/auth/change-password', data),
// };

// src/api/auth.js
import { client } from './client';

export const authApi = {
  // Legacy email/password (kept for backward compatibility, not used by the new flow)
  login:          (email, password) => client.post('/auth/login', { email, password }),

  // Register a profile (name, email, phone) — no password, no auto sign-in
  register:       (data)            => client.post('/auth/register', data),

  // Phone OTP
  sendOtp:        (phone)           => client.post('/auth/send-otp', { phone }),
  verifyOtp:      (phone, otp)      => client.post('/auth/verify-otp', { phone, otp }),

  // Google Sign-In — profile = { idToken, googleId, email, name, photo }
  googleAuth:     (profile)         => client.post('/auth/google', profile),

  getMe:          ()                => client.get('/auth/me'),
  updateMe:       (data)            => client.put('/auth/me', data),
  changePassword: (data)            => client.put('/auth/change-password', data),
};