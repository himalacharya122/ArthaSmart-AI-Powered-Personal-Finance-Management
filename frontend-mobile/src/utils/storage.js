import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  ACCESS_TOKEN: '@arthasmart/access_token',
  REFRESH_TOKEN: '@arthasmart/refresh_token',
  USER: '@arthasmart/user',
  ONBOARDING_DONE: '@arthasmart/onboarding_done',
  PREFERENCES: '@arthasmart/preferences',
  BIOMETRIC_ENABLED: '@arthasmart/biometric_enabled',
  // Biometric re-login: persists across logout so user can re-auth with face/fingerprint
  BIOMETRIC_REFRESH_TOKEN: '@arthasmart/biometric_refresh_token',
  BIOMETRIC_USER: '@arthasmart/biometric_user',
  // Tracks if user has seen the biometric setup prompt (shown once after first login)
  BIOMETRIC_SETUP_SEEN: '@arthasmart/biometric_setup_seen',
  BUDGET_RESET_DAY: '@arthasmart/budget_reset_day',
  MONTHLY_BUDGET: '@arthasmart/monthly_budget',
  CATEGORY_ORDER: '@arthasmart/category_order',
  CATEGORY_BUDGETS: '@arthasmart/category_budgets',
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

  // Biometric
  async isBiometricEnabled() {
    const val = await AsyncStorage.getItem(KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  },
  async setBiometricEnabled(enabled) {
    return AsyncStorage.setItem(KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  },

  // Biometric re-login tokens (survive logout for Face ID / fingerprint login)
  async getBiometricRefreshToken() {
    return AsyncStorage.getItem(KEYS.BIOMETRIC_REFRESH_TOKEN);
  },
  async setBiometricRefreshToken(token) {
    return AsyncStorage.setItem(KEYS.BIOMETRIC_REFRESH_TOKEN, token);
  },
  async getBiometricUser() {
    const raw = await AsyncStorage.getItem(KEYS.BIOMETRIC_USER);
    return raw ? JSON.parse(raw) : null;
  },
  async setBiometricUser(user) {
    return AsyncStorage.setItem(KEYS.BIOMETRIC_USER, JSON.stringify(user));
  },
  async clearBiometricCredentials() {
    await AsyncStorage.multiRemove([
      KEYS.BIOMETRIC_REFRESH_TOKEN,
      KEYS.BIOMETRIC_USER,
      KEYS.BIOMETRIC_ENABLED,
    ]);
  },

  // Biometric setup seen (once shown, don't show again)
  async isBiometricSetupSeen() {
    const val = await AsyncStorage.getItem(KEYS.BIOMETRIC_SETUP_SEEN);
    return val === 'true';
  },
  async setBiometricSetupSeen() {
    return AsyncStorage.setItem(KEYS.BIOMETRIC_SETUP_SEEN, 'true');
  },

  // Preferences
  async getPreferences() {
    const raw = await AsyncStorage.getItem(KEYS.PREFERENCES);
    return raw ? JSON.parse(raw) : {};
  },
  async setPreferences(prefs) {
    return AsyncStorage.setItem(KEYS.PREFERENCES, JSON.stringify(prefs));
  },

  // Budget reset day (integer 1-28, default 1)
  async getBudgetResetDay() {
    const val = await AsyncStorage.getItem(KEYS.BUDGET_RESET_DAY);
    return val ? parseInt(val, 10) : 1;
  },
  async setBudgetResetDay(day) {
    return AsyncStorage.setItem(KEYS.BUDGET_RESET_DAY, String(day));
  },

  // Monthly spending budget amount (null = not set)
  async getMonthlyBudget() {
    const val = await AsyncStorage.getItem(KEYS.MONTHLY_BUDGET);
    return val !== null ? parseFloat(val) : null;
  },
  async setMonthlyBudget(amount) {
    if (amount === null || amount === undefined) {
      return AsyncStorage.removeItem(KEYS.MONTHLY_BUDGET);
    }
    return AsyncStorage.setItem(KEYS.MONTHLY_BUDGET, String(amount));
  },

  // Category display order — stored as JSON object { expense: [id,id,...], income: [id,...] }
  async getCategoryOrder() {
    const raw = await AsyncStorage.getItem(KEYS.CATEGORY_ORDER);
    return raw ? JSON.parse(raw) : {};
  },
  async setCategoryOrder(orderMap) {
    return AsyncStorage.setItem(KEYS.CATEGORY_ORDER, JSON.stringify(orderMap));
  },

  // Per-category monthly budgets — { [categoryId]: number }
  async getCategoryBudgets() {
    const raw = await AsyncStorage.getItem(KEYS.CATEGORY_BUDGETS);
    return raw ? JSON.parse(raw) : {};
  },
  async setCategoryBudgets(map) {
    return AsyncStorage.setItem(KEYS.CATEGORY_BUDGETS, JSON.stringify(map));
  },

  // Clear all
  async clearAll() {
    const keys = Object.values(KEYS);
    await AsyncStorage.multiRemove(keys);
  },
};
