/**
 * Auth store: Zustand + AsyncStorage persistence.
 *
 * Manages: user, tokens, authentication state, onboarding state.
 */
import { create } from 'zustand';
import { storage } from '../utils/storage';
import * as authService from '../services/auth';
import { authenticateWithGoogle } from '../services/googleAuth';

export const useAuthStore = create((set, get) => ({
  // State
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true, // true while checking stored tokens on app launch
  hasSeenOnboarding: false,
  biometricEnabled: false,
  biometricUnlocked: false, // false = needs biometric check on resume

  /**
   * Initialize - called once on app launch.
   * Loads stored tokens/user and checks if onboarding is done.
   */
  initialize: async () => {
    try {
      const [accessToken, refreshToken, user, onboardingDone, biometricEnabled] = await Promise.all([
        storage.getAccessToken(),
        storage.getRefreshToken(),
        storage.getUser(),
        storage.isOnboardingDone(),
        storage.isBiometricEnabled(),
      ]);

      if (accessToken && user) {
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
          hasSeenOnboarding: onboardingDone,
          biometricEnabled,
          biometricUnlocked: !biometricEnabled, // if biometric off, skip lock
        });
      } else {
        set({
          isLoading: false,
          hasSeenOnboarding: onboardingDone,
          biometricEnabled: false,
          biometricUnlocked: true,
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

    const { access, refresh } = data.tokens;
    const user = data.user;

    await Promise.all([
      storage.setAccessToken(access),
      storage.setRefreshToken(refresh),
      storage.setUser(user),
    ]);

    // If biometric is enabled, store tokens for biometric re-login after logout
    const biometricOn = await storage.isBiometricEnabled();
    if (biometricOn) {
      await Promise.all([
        storage.setBiometricRefreshToken(refresh),
        storage.setBiometricUser(user),
      ]);
    }

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
      biometricUnlocked: true,
    });

    return data;
  },

  /**
   * Register a new user (does NOT auto-login - requires email verification).
   * Returns { detail, email } from backend.
   */
  register: async ({ firstName, lastName, email, password }) => {
    const data = await authService.register({ firstName, lastName, email, password });
    return data;
  },

  /**
   * Google OAuth login - send Google token to backend, receive JWT.
   */
  googleLogin: async (googleAccessToken) => {
    const data = await authenticateWithGoogle(googleAccessToken);

    const { access, refresh } = data.tokens;
    const user = data.user;

    await Promise.all([
      storage.setAccessToken(access),
      storage.setRefreshToken(refresh),
      storage.setUser(user),
    ]);

    const biometricOn = await storage.isBiometricEnabled();
    if (biometricOn) {
      await Promise.all([
        storage.setBiometricRefreshToken(refresh),
        storage.setBiometricUser(user),
      ]);
    }

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
      biometricUnlocked: true,
    });

    return data;
  },

  /**
   * Logout - clear session but preserve biometric credentials for re-login.
   */
  logout: async () => {
    const { refreshToken } = get();

    // Blacklist the current session refresh token on the server
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    await storage.clearTokens();
    await storage.clearUser();
    // NOTE: We do NOT clear biometric credentials - they survive logout
    // so the user can re-login with Face ID / fingerprint on the login screen.

    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      biometricUnlocked: false,
    });
  },

  /**
   * Biometric login - use stored biometric refresh token to get a new session.
   * Called from LoginScreen when user authenticates with Face ID / fingerprint.
   */
  biometricLogin: async () => {
    const biometricRefresh = await storage.getBiometricRefreshToken();
    if (!biometricRefresh) throw new Error('No biometric credentials stored');

    // Use refresh token to get new access token
    const data = await authService.refreshToken(biometricRefresh);
    const access = data.access;
    const refresh = data.refresh || biometricRefresh;

    // Get stored biometric user
    const user = await storage.getBiometricUser();
    if (!user) throw new Error('No biometric user data');

    await Promise.all([
      storage.setAccessToken(access),
      storage.setRefreshToken(refresh),
      storage.setUser(user),
      storage.setBiometricRefreshToken(refresh), // Update stored token
    ]);

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
      biometricUnlocked: true,
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
   * Enable/disable biometric lock.
   */
  setBiometricEnabled: async (enabled) => {
    await storage.setBiometricEnabled(enabled);
    if (enabled) {
      // Store current tokens + user for biometric re-login after logout
      const { refreshToken, user } = get();
      if (refreshToken && user) {
        await Promise.all([
          storage.setBiometricRefreshToken(refreshToken),
          storage.setBiometricUser(user),
        ]);
      }
    } else {
      // Clear biometric credentials when disabling
      await storage.clearBiometricCredentials();
      await storage.setBiometricEnabled(false);
    }
    set({ biometricEnabled: enabled, biometricUnlocked: true });
  },

  /**
   * Mark biometric as unlocked (after successful auth).
   */
  unlockBiometric: () => set({ biometricUnlocked: true }),

  /**
   * Lock biometric (when app goes to background).
   */
  lockBiometric: () => {
    const { biometricEnabled } = get();
    if (biometricEnabled) set({ biometricUnlocked: false });
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
