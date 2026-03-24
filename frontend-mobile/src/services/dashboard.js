/**
 * Dashboard API service.
 *
 * Fetches the main dashboard overview and income-vs-expense trends.
 */
import api from './api';

/**
 * Get the dashboard overview for the current user.
 * @returns {Promise<{
 *   total_balance: string,
 *   total_income_this_month: string,
 *   total_expenses_this_month: string,
 *   savings_rate: string,
 *   active_budgets: number,
 *   budgets_at_risk: number,
 *   recent_expenses: Array,
 *   top_categories: Array,
 *   unread_notifications: number,
 *   unread_insights: number,
 * }>}
 */
export async function getDashboard() {
  const { data } = await api.get('/api/v1/reports/dashboard/');
  return data;
}

/**
 * Get income vs expense data for the last N months.
 * @param {number} months — Default 6
 * @returns {Promise<{ monthly_data: Array<{ month: string, income: string, expense: string, net: string }> }>}
 */
export async function getIncomeVsExpense(months = 6) {
  const { data } = await api.get(`/api/v1/reports/income-vs-expense/?months=${months}`);
  return data;
}

/**
 * Get recent expenses (paginated).
 * @param {number} limit — Number of expenses to fetch
 */
export async function getRecentExpenses(limit = 5) {
  const { data } = await api.get(`/api/v1/expenses/?ordering=-date&page_size=${limit}`);
  return data;
}

/**
 * Get recent incomes (paginated).
 * @param {number} limit
 */
export async function getRecentIncomes(limit = 5) {
  const { data } = await api.get(`/api/v1/incomes/?ordering=-date&page_size=${limit}`);
  return data;
}
