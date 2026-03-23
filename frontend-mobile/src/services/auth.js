/**
 * Authentication API service.
 */
import api from './api';

/**
 * Login with email and password.
 * @returns {{ access: string, refresh: string, user: object }}
 */
export async function login(email, password) {
  const { data } = await api.post('/api/v1/auth/login/', { email, password });
  return data;
}

/**
 * Register a new user.
 * @returns {{ access: string, refresh: string, user: object }}
 */
export async function register({ firstName, lastName, email, password }) {
  const { data } = await api.post('/api/v1/auth/register/', {
    first_name: firstName,
    last_name: lastName,
    email,
    password,
    password_confirm: password,
  });
  return data;
}

/**
 * Request password reset email.
 */
export async function forgotPassword(email) {
  const { data } = await api.post('/api/v1/auth/forgot-password/', { email });
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
  const { data } = await api.get('/api/v1/users/me/');
  return data;
}

/**
 * Update the current user's profile.
 */
export async function updateProfile(updates) {
  const { data } = await api.patch('/api/v1/users/me/', updates);
  return data;
}

/**
 * Logout - blacklist the refresh token.
 */
export async function logout(refreshToken) {
  try {
    await api.post('/api/v1/auth/logout/', { refresh: refreshToken });
  } catch {
    // Ignore errors - we're logging out anyway
  }
}
