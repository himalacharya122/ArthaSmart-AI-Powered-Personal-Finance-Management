/**
 * Transactions API service — Expenses & Incomes CRUD.
 */
import api from './api';

/* Expenses */

/**
 * List expenses with optional filters.
 * @param {object} params — { page, page_size, search, ordering, category, date_after, date_before, ... }
 */
export async function getExpenses(params = {}) {
  const { data } = await api.get('/api/v1/expenses/', { params });
  return data;
}

/** Get a single expense by ID. */
export async function getExpense(id) {
  const { data } = await api.get(`/api/v1/expenses/${id}/`);
  return data;
}

/** Create a new expense. */
export async function createExpense(payload) {
  const { data } = await api.post('/api/v1/expenses/', payload);
  return data;
}

/** Update an expense (partial). */
export async function updateExpense(id, payload) {
  const { data } = await api.patch(`/api/v1/expenses/${id}/`, payload);
  return data;
}

/** Delete an expense. */
export async function deleteExpense(id) {
  await api.delete(`/api/v1/expenses/${id}/`);
}

/** Expense summary (totals by category, by month). */
export async function getExpenseSummary(params = {}) {
  const { data } = await api.get('/api/v1/expenses/summary/', { params });
  return data;
}

/* Incomes */

export async function getIncomes(params = {}) {
  const { data } = await api.get('/api/v1/incomes/', { params });
  return data;
}

export async function getIncome(id) {
  const { data } = await api.get(`/api/v1/incomes/${id}/`);
  return data;
}

export async function createIncome(payload) {
  const { data } = await api.post('/api/v1/incomes/', payload);
  return data;
}

export async function updateIncome(id, payload) {
  const { data } = await api.patch(`/api/v1/incomes/${id}/`, payload);
  return data;
}

export async function deleteIncome(id) {
  await api.delete(`/api/v1/incomes/${id}/`);
}

export async function getIncomeSummary(params = {}) {
  const { data } = await api.get('/api/v1/incomes/summary/', { params });
  return data;
}

/* Categories */

/**
 * List categories.
 * @param {'expense'|'income'} type
 */
export async function getCategories(type) {
  const params = { page_size: 100, is_active: true };
  if (type) params.type = type;
  const { data } = await api.get('/api/v1/categories/', { params });
  return data;
}

/** Create a custom category. */
export async function createCategory(payload) {
  const { data } = await api.post('/api/v1/categories/', payload);
  return data;
}

/** Update a category (rename, reorder). */
export async function updateCategory(id, payload) {
  const { data } = await api.patch(`/api/v1/categories/${id}/`, payload);
  return data;
}

/** Delete a custom category. */
export async function deleteCategory(id) {
  await api.delete(`/api/v1/categories/${id}/`);
}

/** @deprecated Use authService.deleteAccount() instead. */
export async function deleteAccount() {
  await api.delete('/api/v1/auth/profile/delete/');
}

/* Recurring Transactions */

export async function getRecurringTransactions(params = {}) {
  const { data } = await api.get('/api/v1/recurring-transactions/', { params });
  return data;
}

export async function createRecurringTransaction(payload) {
  const { data } = await api.post('/api/v1/recurring-transactions/', payload);
  return data;
}

export async function updateRecurringTransaction(id, payload) {
  const { data } = await api.patch(`/api/v1/recurring-transactions/${id}/`, payload);
  return data;
}

export async function deleteRecurringTransaction(id) {
  await api.delete(`/api/v1/recurring-transactions/${id}/`);
}
