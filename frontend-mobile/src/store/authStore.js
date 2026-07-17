/**
 * Auth store: Zustand + AsyncStorage persistence.
 *
 * Manages: user, tokens, authentication state, onboarding state, biometric.
 */
import { create } from 'zustand';
import { storage } from '../utils/storage';
import * as authService from '../services/auth';
import { authenticateWithGoogle } from '../services/googleAuth';
import * as biometricService from '../services/biometric';

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
  showBiometricSetup: false, // true = show biometric setup screen after login

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
        // Scope storage to this user BEFORE the rest of the app starts reading
        // user-specific keys (budgets, prefs). Also runs the legacy migration
        // once on the first init after the multi-user storage rollout.
        await storage.setCurrentUserId(user.id);
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
        await storage.setCurrentUserId(null);
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
   * Checks if the biometric setup prompt should be shown after login.
   * Shows once if: biometric hardware available, not yet enabled, setup not seen.
   */
  _checkShouldShowBiometricSetup: async () => {
    try {
      const [support, setupSeen, biometricOn] = await Promise.all([
        biometricService.checkBiometricSupport(),
        storage.isBiometricSetupSeen(),
        storage.isBiometricEnabled(),
      ]);
      if (support.available && support.enrolled && !setupSeen && !biometricOn) {
        set({ showBiometricSetup: true });
      }
    } catch { /* silent */ }
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
    // Scope subsequent storage reads/writes to this user (multi-account safety)
    await storage.setCurrentUserId(user.id);

    // If biometric is already enabled, update the user info but keep the biometric token
    // (the logout pre-refresh flow keeps the biometric token fresh and separate)
    const biometricOn = await storage.isBiometricEnabled();
    if (biometricOn) {
      await storage.setBiometricUser(user);
      // Only set biometric refresh token if there isn't one already
      const existingBioToken = await storage.getBiometricRefreshToken();
      if (!existingBioToken) {
        await storage.setBiometricRefreshToken(refresh);
      }
    }

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
      biometricUnlocked: true,
    });

    // Check if we should show biometric setup prompt
    await get()._checkShouldShowBiometricSetup();

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
      await storage.setBiometricUser(user);
      const existingBioToken = await storage.getBiometricRefreshToken();
      if (!existingBioToken) {
        await storage.setBiometricRefreshToken(refresh);
      }
    }

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
      biometricUnlocked: true,
    });

    await get()._checkShouldShowBiometricSetup();

    return data;
  },

  /**
   * Logout - clears session but preserves biometric credentials for re-login.
   * Pre-refreshes token so biometric token stays valid across logout.
   * (ROTATE_REFRESH_TOKENS=True: old token blacklisted, fresh token issued → stored for biometric)
   */
  logout: async () => {
    const { refreshToken, biometricEnabled } = get();

    if (biometricEnabled && refreshToken) {
      try {
        const data = await authService.refreshToken(refreshToken);
        if (data.refresh) {
          // Store the fresh, non-blacklisted token for biometric re-login
          await Promise.all([
            storage.setBiometricRefreshToken(data.refresh),
            storage.setBiometricUser(get().user),
          ]);
          // The old refreshToken was already consumed/blacklisted by rotation above
          // Attempt to explicitly blacklist it too (may 400 if already rotated — that's OK)
          authService.logout(refreshToken).catch(() => {});
        } else {
          // Token rotation disabled — biometric token and session token are the same;
          // blacklist session and biometric will also be invalidated (acceptable)
          await authService.logout(refreshToken);
        }
      } catch {
        // If pre-refresh fails (network issue, token already expired), just logout
        authService.logout(refreshToken).catch(() => {});
      }
    } else if (refreshToken) {
      await authService.logout(refreshToken);
    }

    await storage.clearTokens();
    await storage.clearUser();
    // NOTE: biometric credentials survive logout intentionally (for biometric re-login)
    // Reset storage scope so any reads while logged-out resolve to a 'guest'
    // namespace and never leak into the previous user's data.
    await storage.setCurrentUserId(null);

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

    const data = await authService.refreshToken(biometricRefresh);
    const access = data.access;
    const refresh = data.refresh || biometricRefresh;

    const user = await storage.getBiometricUser();
    if (!user) throw new Error('No biometric user data');

    await Promise.all([
      storage.setAccessToken(access),
      storage.setRefreshToken(refresh),
      storage.setUser(user),
      storage.setBiometricRefreshToken(refresh), // keep biometric token rotated
    ]);
    // Scope storage to this user (biometric login is still a fresh session)
    await storage.setCurrentUserId(user.id);

    set({
      accessToken: access,
      refreshToken: refresh,
      user,
      isAuthenticated: true,
      biometricUnlocked: true,
    });
  },

  /**
   * Clear biometric credentials and update store (called when biometric login fails).
   */
  resetBiometricCredentials: async () => {
    await storage.clearBiometricCredentials();
    set({ biometricEnabled: false, biometricUnlocked: true });
  },

  /**
   * Dismiss the biometric setup screen. Marks as seen so it won't show again.
   */
  dismissBiometricSetup: async () => {
    await storage.setBiometricSetupSeen();
    set({ showBiometricSetup: false });
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
      const { refreshToken, user } = get();
      if (refreshToken && user) {
        await Promise.all([
          storage.setBiometricRefreshToken(refreshToken),
          storage.setBiometricUser(user),
        ]);
      }
      // Mark setup as seen so the prompt doesn't appear again
      await storage.setBiometricSetupSeen();
    } else {
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
