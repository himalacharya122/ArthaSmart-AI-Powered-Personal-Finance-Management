/**
 * AsyncStorage wrapper for type-safe, consistent storage access.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@arthasmart/access_token',
  REFRESH_TOKEN: '@arthasmart/refresh_token',
  USER: '@arthasmart/user',
  ONBOARDING_DONE: '@arthasmart/onboarding_done',
  PREFERENCES: '@arthasmart/preferences',
};

export const storage = {
  // Tokens
  async getAccessToken() {
    return AsyncStorage.getItem(KEYS.ACCESS_TOKEN);
  },
  async setAccessToken(token) {
    return AsyncStorage.setItem(KEYS.ACCESS_TOKEN, token);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(KEYS.REFRESH_TOKEN);
  },
  async setRefreshToken(token) {
    return AsyncStorage.setItem(KEYS.REFRESH_TOKEN, token);
  },
  async clearTokens() {
    await AsyncStorage.multiRemove([KEYS.ACCESS_TOKEN, KEYS.REFRESH_TOKEN]);
  },

  // User
  async getUser() {
    const raw = await AsyncStorage.getItem(KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async setUser(user) {
    return AsyncStorage.setItem(KEYS.USER, JSON.stringify(user));
  },
  async clearUser() {
    return AsyncStorage.removeItem(KEYS.USER);
  },

  // Onboarding
  async isOnboardingDone() {
    const val = await AsyncStorage.getItem(KEYS.ONBOARDING_DONE);
    return val === 'true';
  },
  async setOnboardingDone() {
    return AsyncStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
  },

  // Preferences
  async getPreferences() {
    const raw = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return raw ? JSON.parse(raw) : {};
  },
  async setPreferences(prefs) {
    return AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  },

  // Clear all
  async clearAll() {
    const keys = Object.values(KEYS);
    await AsyncStorage.multiRemove(keys);
  },
};
