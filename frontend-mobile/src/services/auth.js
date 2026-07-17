/**
 * Authentication API service.
 *
 * Backend returns: { user: {...}, tokens: { access, refresh } }
 */
import api from './api';

/**
 * Login with email and password.
 * @returns {{ user: object, tokens: { access: string, refresh: string } }}
 */
export async function login(email, password) {
  const { data } = await api.post('/api/v1/auth/login/', { email, password });
  return data;
}

/**
 * Register a new user.
 * @returns {{ user: object, tokens: { access: string, refresh: string } }}
 */
export async function register({ firstName, lastName, email, password }) {
  const { data } = await api.post('/api/v1/auth/register/', {
    first_name: firstName,
    last_name: lastName,
    email,
    username: email.split('@')[0],
    password,
    password_confirm: password,
  });
  return data;
}

/**
 * Verify email with 6-digit code.
 * @returns {{ detail: string }}
 */
export async function verifyEmail(email, code) {
  const { data } = await api.post('/api/v1/auth/verify-email/', { email, code });
  return data;
}

/**
 * Resend email verification code.
 * @returns {{ detail: string }}
 */
export async function resendVerification(email) {
  const { data } = await api.post('/api/v1/auth/resend-verification/', { email });
  return data;
}

/**
 * Request password reset email.
 */
export async function forgotPassword(email) {
  const { data } = await api.post('/api/v1/auth/password/reset/', { email });
  return data;
}

/**
 * Refresh the access token.
 */
export async function refreshToken(refresh) {
  const { data } = await api.post('/api/v1/auth/token/refresh/', { refresh });
  return data;
}

/**
 * Get the current user's profile.
 */
export async function getProfile() {
  const { data } = await api.get('/api/v1/auth/profile/');
  return data;
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(updates) {
  const { data } = await api.patch('/api/v1/auth/profile/', updates);
  return data;
}

/**
 * Change the current user's password.
 * @param {{ old_password: string, new_password: string, new_password_confirm: string }} payload
 */
export async function changePassword(payload) {
  const { data } = await api.post('/api/v1/auth/password/change/', payload);
  return data;
}

/**
 * Delete the current user's account (soft delete).
 */
export async function deleteAccount() {
  await api.delete('/api/v1/auth/profile/delete/');
}

/**
 * Logout — blacklist the refresh token.
 */
export async function logout(refreshToken) {
  try {
    await api.post('/api/v1/auth/logout/', { refresh: refreshToken });
  } catch {
    // Ignore errors — we're logging out anyway
  }
}
