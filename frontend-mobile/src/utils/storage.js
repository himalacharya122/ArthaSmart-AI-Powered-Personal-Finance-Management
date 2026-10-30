import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────────
// Storage layout
// ─────────────────────────────────────────────────────────────────────────────
// Device-level keys (one per install — shared across users on this device):
//   @squirrel/access_token, refresh_token, user (current session)
//   @squirrel/onboarding_done
//   @squirrel/biometric_enabled, biometric_refresh_token, biometric_user,
//   @squirrel/biometric_setup_seen
//
// User-scoped keys (one per user-id — survive logout, isolated per account):
//   @squirrel/u:<userId>/preferences
//   @squirrel/u:<userId>/budget_reset_day
//   @squirrel/u:<userId>/monthly_budget
//   @squirrel/u:<userId>/category_order
//   @squirrel/u:<userId>/category_budgets
//
// `setCurrentUserId(id)` MUST be called on app init and after login so the
// user-scoped getters/setters resolve to the correct namespace. On logout it
// should be called with null so anonymous reads land in a "guest" namespace
// rather than leaking into the previous user's data.
// ─────────────────────────────────────────────────────────────────────────────

const DEVICE_KEYS = {
  ACCESS_TOKEN: '@squirrel/access_token',
  REFRESH_TOKEN: '@squirrel/refresh_token',
  USER: '@squirrel/user',
  ONBOARDING_DONE: '@squirrel/onboarding_done',
  BIOMETRIC_ENABLED: '@squirrel/biometric_enabled',
  BIOMETRIC_REFRESH_TOKEN: '@squirrel/biometric_refresh_token',
  BIOMETRIC_USER: '@squirrel/biometric_user',
  BIOMETRIC_SETUP_SEEN: '@squirrel/biometric_setup_seen',
};

const USER_SUBKEYS = {
  PREFERENCES: 'preferences',
  BUDGET_RESET_DAY: 'budget_reset_day',
  MONTHLY_BUDGET: 'monthly_budget',
  CATEGORY_ORDER: 'category_order',
  CATEGORY_BUDGETS: 'category_budgets',
};

// Old (pre-multi-user) global keys for these settings. We migrate from here.
const LEGACY_GLOBAL = {
  [USER_SUBKEYS.PREFERENCES]: '@squirrel/preferences',
  [USER_SUBKEYS.BUDGET_RESET_DAY]: '@squirrel/budget_reset_day',
  [USER_SUBKEYS.MONTHLY_BUDGET]: '@squirrel/monthly_budget',
  [USER_SUBKEYS.CATEGORY_ORDER]: '@squirrel/category_order',
  [USER_SUBKEYS.CATEGORY_BUDGETS]: '@squirrel/category_budgets',
};

let _currentUserId = null;

const _userKey = (sub) => `@squirrel/u:${_currentUserId || 'guest'}/${sub}`;

/**
 * One-time migration: if any of the legacy global keys still hold data, move
 * it into the now-known user's namespace (only if that user doesn't already
 * have a value), then remove the legacy key so subsequent users start clean.
 *
 * Idempotent — safe to run on every login.
 */
async function _migrateLegacyToUser(userId) {
  if (!userId) return;
  await Promise.all(
    Object.entries(LEGACY_GLOBAL).map(async ([sub, legacyKey]) => {
      const legacyVal = await AsyncStorage.getItem(legacyKey);
      if (legacyVal == null) return;
      const userKey = `@squirrel/u:${userId}/${sub}`;
      const existing = await AsyncStorage.getItem(userKey);
      if (existing == null) {
        await AsyncStorage.setItem(userKey, legacyVal);
      }
      // Always remove the legacy key — its job is done. Otherwise the next
      // logged-in user would inherit this same data.
      await AsyncStorage.removeItem(legacyKey);
    })
  );
}

export const storage = {
  // Multi-account scoping
  /**
   * Sets the active user namespace for user-scoped getters/setters.
   * Call on app init (with cached user.id), after login, and after logout
   * (with null). Runs the legacy-global migration the first time a user id
   * is set.
   */
  async setCurrentUserId(id) {
    const next = id != null ? String(id) : null;
    if (_currentUserId === next) return;
    if (next) await _migrateLegacyToUser(next);
    _currentUserId = next;
  },

  getCurrentUserId() {
    return _currentUserId;
  },

  // Tokens
  async getAccessToken() {
    return AsyncStorage.getItem(DEVICE_KEYS.ACCESS_TOKEN);
  },
  async setAccessToken(token) {
    return AsyncStorage.setItem(DEVICE_KEYS.ACCESS_TOKEN, token);
  },
  async getRefreshToken() {
    return AsyncStorage.getItem(DEVICE_KEYS.REFRESH_TOKEN);
  },
  async setRefreshToken(token) {
    return AsyncStorage.setItem(DEVICE_KEYS.REFRESH_TOKEN, token);
  },
  async clearTokens() {
    await AsyncStorage.multiRemove([DEVICE_KEYS.ACCESS_TOKEN, DEVICE_KEYS.REFRESH_TOKEN]);
  },

  // User (current session)
  async getUser() {
    const raw = await AsyncStorage.getItem(DEVICE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  },
  async setUser(user) {
    return AsyncStorage.setItem(DEVICE_KEYS.USER, JSON.stringify(user));
  },
  async clearUser() {
    return AsyncStorage.removeItem(DEVICE_KEYS.USER);
  },

  // Onboarding (device-level)
  async isOnboardingDone() {
    const val = await AsyncStorage.getItem(DEVICE_KEYS.ONBOARDING_DONE);
    return val === 'true';
  },
  async setOnboardingDone() {
    return AsyncStorage.setItem(DEVICE_KEYS.ONBOARDING_DONE, 'true');
  },

  // Biometric (device-level)
  async isBiometricEnabled() {
    const val = await AsyncStorage.getItem(DEVICE_KEYS.BIOMETRIC_ENABLED);
    return val === 'true';
  },
  async setBiometricEnabled(enabled) {
    return AsyncStorage.setItem(DEVICE_KEYS.BIOMETRIC_ENABLED, enabled ? 'true' : 'false');
  },
  async getBiometricRefreshToken() {
    return AsyncStorage.getItem(DEVICE_KEYS.BIOMETRIC_REFRESH_TOKEN);
  },
  async setBiometricRefreshToken(token) {
    return AsyncStorage.setItem(DEVICE_KEYS.BIOMETRIC_REFRESH_TOKEN, token);
  },
  async getBiometricUser() {
    const raw = await AsyncStorage.getItem(DEVICE_KEYS.BIOMETRIC_USER);
    return raw ? JSON.parse(raw) : null;
  },
  async setBiometricUser(user) {
    return AsyncStorage.setItem(DEVICE_KEYS.BIOMETRIC_USER, JSON.stringify(user));
  },
  async clearBiometricCredentials() {
    await AsyncStorage.multiRemove([
      DEVICE_KEYS.BIOMETRIC_REFRESH_TOKEN,
      DEVICE_KEYS.BIOMETRIC_USER,
      DEVICE_KEYS.BIOMETRIC_ENABLED,
    ]);
  },
  async isBiometricSetupSeen() {
    const val = await AsyncStorage.getItem(DEVICE_KEYS.BIOMETRIC_SETUP_SEEN);
    return val === 'true';
  },
  async setBiometricSetupSeen() {
    return AsyncStorage.setItem(DEVICE_KEYS.BIOMETRIC_SETUP_SEEN, 'true');
  },

  // User-scoped: Preferences
  async getPreferences() {
    const raw = await AsyncStorage.getItem(_userKey(USER_SUBKEYS.PREFERENCES));
    return raw ? JSON.parse(raw) : {};
  },
  async setPreferences(prefs) {
    return AsyncStorage.setItem(_userKey(USER_SUBKEYS.PREFERENCES), JSON.stringify(prefs));
  },

  // User-scoped: Budget reset day (1-28, default 1)
  async getBudgetResetDay() {
    const val = await AsyncStorage.getItem(_userKey(USER_SUBKEYS.BUDGET_RESET_DAY));
    return val ? parseInt(val, 10) : 1;
  },
  async setBudgetResetDay(day) {
    return AsyncStorage.setItem(_userKey(USER_SUBKEYS.BUDGET_RESET_DAY), String(day));
  },

  // User-scoped: Monthly spending budget (null = not set)
  async getMonthlyBudget() {
    const val = await AsyncStorage.getItem(_userKey(USER_SUBKEYS.MONTHLY_BUDGET));
    return val !== null ? parseFloat(val) : null;
  },
  async setMonthlyBudget(amount) {
    if (amount == null) {
      return AsyncStorage.removeItem(_userKey(USER_SUBKEYS.MONTHLY_BUDGET));
    }
    return AsyncStorage.setItem(_userKey(USER_SUBKEYS.MONTHLY_BUDGET), String(amount));
  },

  // User-scoped: Category display order
  async getCategoryOrder() {
    const raw = await AsyncStorage.getItem(_userKey(USER_SUBKEYS.CATEGORY_ORDER));
    return raw ? JSON.parse(raw) : {};
  },
  async setCategoryOrder(orderMap) {
    return AsyncStorage.setItem(_userKey(USER_SUBKEYS.CATEGORY_ORDER), JSON.stringify(orderMap));
  },

  // User-scoped: Per-category budgets
  async getCategoryBudgets() {
    const raw = await AsyncStorage.getItem(_userKey(USER_SUBKEYS.CATEGORY_BUDGETS));
    return raw ? JSON.parse(raw) : {};
  },
  async setCategoryBudgets(map) {
    return AsyncStorage.setItem(_userKey(USER_SUBKEYS.CATEGORY_BUDGETS), JSON.stringify(map));
  },

  // Clear-all (used on app reset / debug)
  async clearAll() {
    const all = await AsyncStorage.getAllKeys();
    const ours = all.filter((k) => k.startsWith('@squirrel/'));
    if (ours.length) await AsyncStorage.multiRemove(ours);
    _currentUserId = null;
  },
};
