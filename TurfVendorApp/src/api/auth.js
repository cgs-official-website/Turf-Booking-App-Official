import { apiRequest } from './client';

export const loginVendorApi = (credentials) =>
  apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ ...credentials, role: 'vendor' }),
  });

export const registerVendorApi = (data) =>
  apiRequest('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...data, role: 'vendor' }),
  });

export const getMeApi = () => apiRequest('/auth/me');

export const updateProfileApi = (data) =>
  apiRequest('/auth/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

// ─── Forgot / Reset password ───────────────────────────────────────────────

export const forgotPasswordApi = (email) =>
  apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email: String(email).trim(), role: 'vendor' }),
  });

export const verifyResetOtpApi = (email, otp) =>
  apiRequest('/auth/verify-reset-otp', {
    method: 'POST',
    body: JSON.stringify({ email: String(email).trim(), otp: String(otp).trim(), role: 'vendor' }),
  });

export const resetPasswordApi = ({ email, resetToken, newPassword }) =>
  apiRequest('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      email: String(email).trim(),
      resetToken,
      newPassword,
      role: 'vendor',
    }),
  });