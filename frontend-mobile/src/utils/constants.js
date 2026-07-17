import { Platform } from 'react-native';

/**
 * API base URL — adjust for your dev environment.
 *
 * Android emulator uses 10.0.2.2 to reach host localhost.
 * iOS simulator and physical devices use the machine's LAN IP.
 * For Expo Go on a physical device, use your machine's LAN IP.
 */
const DEV_API_URL = Platform.select({
  android: 'http://10.0.2.2:8000',
  ios: 'http://localhost:8000',
  default: 'http://localhost:8000',
});

// For physical device testing via Expo Go, replace with LAN IP:
// home 'http://192.168.1.102:8000'-
// college ipv4 address = 172.22.18.220
export const API_BASE_URL = __DEV__
  ? 'http://192.168.1.102:8000'
  : 'https://api.arthasmart.com';

export const API_TIMEOUT = 30000; // 30 seconds

export const SCREEN_NAMES = {
  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  ONBOARDING: 'Onboarding',
  VERIFY_EMAIL: 'VerifyEmail',
  BIOMETRIC_SETUP: 'BiometricSetup',

  // Main tabs
  HOME_TAB: 'HomeTab',
  TRANSACTIONS_TAB: 'TransactionsTab',
  SCAN_TAB: 'ScanTab',
  CHAT_TAB: 'ChatTab',
  SETTINGS_TAB: 'SettingsTab',

  // Home stack
  HOME: 'Home',
  NOTIFICATION_LIST: 'NotificationList',

  // Transactions stack
  TRANSACTIONS: 'Transactions',
  ADD_EXPENSE: 'AddExpense',
  ADD_INCOME: 'AddIncome',
  TRANSACTION_DETAIL: 'TransactionDetail',

  // Scan stack
  SCANNER: 'Scanner',
  SCAN_PROCESSING: 'ScanProcessing',
  SCAN_REVIEW: 'ScanReview',
  RECEIPTS_HISTORY: 'ReceiptsHistory',

  // Chat stack
  AI_HUB: 'AIHub',
  AI_CHAT: 'AIChat',
  CHAT_HISTORY: 'ChatHistory',
  INSIGHTS: 'Insights',
  ANOMALIES: 'Anomalies',
  FINANCIAL_REPORT: 'FinancialReport',

  // Success screens
  SUCCESS: 'Success',

  // Settings stack
  SETTINGS: 'Settings',
  PROFILE: 'Profile',
  CATEGORIES: 'Categories',
  EXPORT_DATA: 'ExportData',
  ABOUT: 'About',
  PRIVACY_POLICY: 'PrivacyPolicy',
  TERMS_OF_SERVICE: 'TermsOfService',
  MONTHLY_BUDGET: 'MonthlyBudget',
  CATEGORY_BUDGETS: 'CategoryBudgets',
};

export const CATEGORY_ICONS = {
  'Food & Dining': 'restaurant',
  Transport: 'directions-car',
  Shopping: 'shopping-bag',
  Utilities: 'bolt',
  Health: 'favorite',
  Education: 'school',
  Entertainment: 'movie',
  Groceries: 'local-grocery-store',
  Rent: 'home',
  Salary: 'account-balance-wallet',
  Freelance: 'laptop',
  Investment: 'trending-up',
  Gift: 'card-giftcard',
  Other: 'more-horiz',
};
