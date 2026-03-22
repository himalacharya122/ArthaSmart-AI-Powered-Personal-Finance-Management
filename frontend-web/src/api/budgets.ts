import apiClient from './client';
import type { Budget, BudgetCreate, BudgetFilters } from '@/types/budget';
import type { PaginatedResponse } from '@/types/api';

export async function fetchBudgets(filters: BudgetFilters = {}): Promise<PaginatedResponse<Budget>> {
  const res = await apiClient.get<PaginatedResponse<Budget>>('/budgets/', { params: filters });
  return res.data;
}

export async function createBudget(data: BudgetCreate): Promise<Budget> {
  const res = await apiClient.post<Budget>('/budgets/', data);
  return res.data;
}

export async function updateBudget(id: number, data: Partial<BudgetCreate>): Promise<Budget> {
  const res = await apiClient.patch<Budget>(`/budgets/${id}/`, data);
  return res.data;
}

export async function deleteBudget(id: number): Promise<void> {
  await apiClient.delete(`/budgets/${id}/`);
}

export async function checkBudgetAlerts(id: number): Promise<{
  alert_triggered: boolean;
  percentage_used: number;
  spent: string;
  amount: string;
  remaining: string;
}> {
  const res = await apiClient.post(`/budgets/${id}/check-alerts/`);
  return res.data;
}
