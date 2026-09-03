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
// TODO: backend mail-sending route (POST /vendor/auth/forgot-password and
// /vendor/auth/reset-password) is not ready yet. These are mocked so the
// screens can be built and tested end-to-end now — swap the body of each
// function for the commented `apiRequest(...)` call once the backend exists.

export const forgotPasswordApi = (email) => {
  // return apiRequest('/vendor/auth/forgot-password', {
  //   method: 'POST',
  //   body: JSON.stringify({ email }),
  // });
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!email || !email.includes('@')) {
        reject(new Error('Enter a valid email address'));
        return;
      }
      resolve({ message: `Reset instructions sent to ${email}` });
    }, 800);
  });
};

export const resetPasswordApi = ({ email, otp, newPassword }) => {
  // return apiRequest('/vendor/auth/reset-password', {
  //   method: 'POST',
  //   body: JSON.stringify({ email, otp, newPassword }),
  // });
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (!newPassword || newPassword.length < 6) {
        reject(new Error('Password must be at least 6 characters'));
        return;
      }
      resolve({ message: 'Password reset successful' });
    }, 800);
  });
};