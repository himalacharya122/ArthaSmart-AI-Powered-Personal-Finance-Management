import { storage } from './storage';

export async function getCurrentBudgetPeriod() {
  const resetDay = await storage.getBudgetResetDay();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  let start;
  if (now.getDate() >= resetDay) {
    start = new Date(year, month, resetDay);
  } else {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    start = new Date(prevYear, prevMonth, resetDay);
  }

  const startNext = new Date(start);
  startNext.setMonth(startNext.getMonth() + 1);
  const end = new Date(startNext.getTime() - 86400000);

  return { start, end, resetDay };
}

export function toApiDate(date) {
  return date.toISOString().split('T')[0];
}

export function formatResetDay(day) {
  const suffixes = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = (day >= 11 && day <= 13) ? 'th' : (suffixes[day % 10] || 'th');
  return `${day}${suffix} of each month`;
}

export function formatPeriodRange(start, end) {
  const opts = { month: 'short', day: 'numeric' };
  const sameYear = start.getFullYear() === end.getFullYear();
  const startStr = start.toLocaleDateString(undefined, opts);
  const endStr = end.toLocaleDateString(undefined, sameYear ? opts : { ...opts, year: 'numeric' });
  return `${startStr} – ${endStr}`;
}
