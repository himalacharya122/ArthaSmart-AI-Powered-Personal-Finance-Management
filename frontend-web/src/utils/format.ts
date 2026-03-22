import { format, formatDistanceToNow, parseISO } from 'date-fns';

const CURRENCY_SYMBOLS: Record<string, string> = {
  NPR: 'Rs',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  INR: '\u20B9',
};

export function formatCurrency(amount: string | number, currency = 'NPR'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const symbol = CURRENCY_SYMBOLS[currency] || currency;
  return `${symbol} ${num.toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(dateStr: string, pattern = 'dd MMM yyyy'): string {
  return format(parseISO(dateStr), pattern);
}

export function formatRelativeDate(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatPercentage(value: number | string): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return `${num.toFixed(1)}%`;
}
