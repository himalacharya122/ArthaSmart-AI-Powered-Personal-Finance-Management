import apiClient from './client';
import type { Expense, ExpenseDetail, ExpenseCreate, ExpenseFilters, ExpenseSummary } from '@/types/expense';
import type { PaginatedResponse } from '@/types/api';

export async function fetchExpenses(filters: ExpenseFilters = {}): Promise<PaginatedResponse<Expense>> {
  const res = await apiClient.get<PaginatedResponse<Expense>>('/expenses/', { params: filters });
  return res.data;
}

export async function fetchExpense(id: number): Promise<ExpenseDetail> {
  const res = await apiClient.get<ExpenseDetail>(`/expenses/${id}/`);
  return res.data;
}

export async function createExpense(data: ExpenseCreate): Promise<ExpenseDetail> {
  const res = await apiClient.post<ExpenseDetail>('/expenses/', data);
  return res.data;
}

export async function updateExpense(id: number, data: Partial<ExpenseCreate>): Promise<ExpenseDetail> {
  const res = await apiClient.patch<ExpenseDetail>(`/expenses/${id}/`, data);
  return res.data;
}

export async function deleteExpense(id: number): Promise<void> {
  await apiClient.delete(`/expenses/${id}/`);
}

export async function fetchExpenseSummary(filters: Pick<ExpenseFilters, 'date_after' | 'date_before'> = {}): Promise<ExpenseSummary> {
  const res = await apiClient.get<ExpenseSummary>('/expenses/summary/', { params: filters });
  return res.data;
}
