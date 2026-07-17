/**
 * Axios instance with JWT auth interceptors.
 *
 * - Attaches access token to every request
 * - On 401, tries to refresh the token and retry the original request
 * - On refresh failure, logs the user out
 */
import axios from 'axios';
import { storage } from '../utils/storage';
import { API_BASE_URL, API_TIMEOUT } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Track refresh state to prevent multiple simultaneous refreshes
let isRefreshing = false;
let failedQueue = [];

function processQueue(error, token = null) {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
}

// --- Request interceptor: attach access token ---
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// --- Response interceptor: handle 401 with token refresh ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Don't retry if it's the refresh request itself, or already retried
    if (
      error.response?.status !== 401 ||
      originalRequest._retry ||
      originalRequest.url?.includes('/auth/token/refresh/')
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Queue this request until refresh completes
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await storage.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token');
      }

      const response = await axios.post(`${API_BASE_URL}/api/v1/auth/token/refresh/`, {
        refresh: refreshToken,
      });

      const { access } = response.data;
      await storage.setAccessToken(access);

      // If the server rotates refresh tokens, store the new one
      if (response.data.refresh) {
        await storage.setRefreshToken(response.data.refresh);
      }

      processQueue(null, access);

      originalRequest.headers.Authorization = `Bearer ${access}`;
      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);

      // Refresh failed — clear auth and let the app redirect to login
      await storage.clearTokens();
      await storage.clearUser();

      // Import authStore lazily to avoid circular dependency
      const { useAuthStore } = require('../store/authStore');
      useAuthStore.getState().reset();

      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export default api;
