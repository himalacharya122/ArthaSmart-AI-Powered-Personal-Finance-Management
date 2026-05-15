export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export const CURRENCIES = [
  { code: 'NPR', symbol: 'Rs', name: 'Nepalese Rupee' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '\u20AC', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', name: 'British Pound' },
  { code: 'INR', symbol: '\u20B9', name: 'Indian Rupee' },
] as const;

export const DEFAULT_CURRENCY = 'NPR';

export const DEFAULT_PAGE_SIZE = 20;

export const APP_NAME = 'Kash';
