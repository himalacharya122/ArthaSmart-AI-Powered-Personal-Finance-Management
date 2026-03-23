/**
 * Formatting utilities for currency, dates, percentages.
 */
import { format, formatDistanceToNow, isToday, isYesterday, parseISO } from 'date-fns';

/**
 * Format amount as currency string.
 * @param {number} amount
 * @param {string} currency - e.g., 'NPR', 'USD'
 * @returns {string} e.g., "Rs 1,500.00" or "$1,500.00"
 */
export function formatCurrency(amount, currency = 'NPR') {
  const num = Number(amount) || 0;
  const formatted = num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbols = {
    NPR: 'Rs',
    USD: '$',
    EUR: '\u20AC',
    GBP: '\u00A3',
    INR: '\u20B9',
  };

  const symbol = symbols[currency] || currency;
  return `${symbol} ${formatted}`;
}

/**
 * Format a compact currency (no decimals for whole numbers).
 */
export function formatCurrencyCompact(amount, currency = 'NPR') {
  const num = Number(amount) || 0;
  const formatted = Number.isInteger(num)
    ? num.toLocaleString('en-US')
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const symbols = { NPR: 'Rs', USD: '$', EUR: '\u20AC', GBP: '\u00A3', INR: '\u20B9' };
  return `${symbols[currency] || currency} ${formatted}`;
}

/**
 * Format date for display.
 * @param {string} dateStr - ISO date string
 * @returns {string} e.g., "Today", "Yesterday", "Mar 20, 2026"
 */
export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (isToday(d)) return 'Today';
  if (isYesterday(d)) return 'Yesterday';
  return format(d, 'MMM d, yyyy');
}

/**
 * Format relative date.
 * @param {string} dateStr - ISO date string
 * @returns {string} e.g., "2 hours ago", "3 days ago"
 */
export function formatRelativeDate(dateStr) {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format time.
 */
export function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  return format(d, 'h:mm a');
}

/**
 * Format date for section headers in transaction lists.
 * Groups by "TODAY", "YESTERDAY", or "MMM DD".
 */
export function formatSectionDate(dateStr) {
  if (!dateStr) return '';
  const d = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr;
  if (isToday(d)) return 'TODAY';
  if (isYesterday(d)) return 'YESTERDAY';
  return format(d, 'MMM dd').toUpperCase();
}

/**
 * Format percentage.
 */
export function formatPercent(value, decimals = 1) {
  return `${(Number(value) || 0).toFixed(decimals)}%`;
}
