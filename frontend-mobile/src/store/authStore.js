/**
 * Auth store — Zustand + AsyncStorage persistence.
 *
 * Manages: user, tokens, authentication state, onboarding state.
 */
import { create } from 'zustand';
import { storage } from '../utils/storage';
import * as authService from '../services/auth';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // true while checking stored tokens on app launch
  hasSeenOnboarding: false,

  /**
   * Initialize — called once on app launch.
   * Loads stored tokens/user and checks if onboarding is done.
   */
  initialize: async () => {
    try {
      const [accessToken, refreshToken, user, onboardingDone] = await Promise.all([
        storage.getAccessToken(),
        storage.getRefreshToken(),
        storage.getUser(),
        storage.isOnboardingDone(),
      ]);

      if (accessToken && user) {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
          hasSeenOnboarding: onboardingDone,
        });
      } else {
        set({
          isLoading: false,
          hasSeenOnboarding: onboardingDone,
        });
      }
    } catch (error) {
      console.warn('Failed to initialize auth:', error);
      set({ isLoading: false });
    }
  },

  /**
   * Login with email and password.
   */
  login: async (email, password) => {
    const data = await authService.login(email, password);

    // Backend returns: { user: {...}, tokens: { access, refresh } }
    const { access, refresh } = data.tokens;
    const user = data.user;

    await Promise.all([
      storage.setAccessToken(access),
      storage.setRefreshToken(refresh),
      storage.setUser(user),
    ]);

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
    });

    return data;
  },

  /**
   * Register a new user.
   */
  register: async ({ firstName, lastName, email, password }) => {
    const data = await authService.register({ firstName, lastName, email, password });

    const { access, refresh } = data.tokens;
    const user = data.user;

    await Promise.all([
      storage.setAccessToken(access),
      storage.setRefreshToken(refresh),
      storage.setUser(user),
    ]);

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
    });

    return data;
  },

  /**
   * Logout — clear everything.
   */
  logout: async () => {
    const { refreshToken } = get();

    // Blacklist the refresh token on the server
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    await storage.clearTokens();
    await storage.clearUser();

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },

  /**
   * Update stored user data (e.g., after profile edit).
   */
  setUser: async (user) => {
    await storage.setUser(user);
    set({ user });
  },

  /**
   * Mark onboarding as complete.
   */
  completeOnboarding: async () => {
    await storage.setOnboardingDone();
    set({ hasSeenOnboarding: true });
  },

  /**
   * Reset state (called on token refresh failure).
   */
  reset: () => {
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
    });
  },
}));
