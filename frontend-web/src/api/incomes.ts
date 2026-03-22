import apiClient from './client';
import type { Income, IncomeDetail, IncomeCreate, IncomeFilters, IncomeSummary } from '@/types/income';
import type { PaginatedResponse } from '@/types/api';

export async function fetchIncomes(filters: IncomeFilters = {}): Promise<PaginatedResponse<Income>> {
  const res = await apiClient.get<PaginatedResponse<Income>>('/incomes/', { params: filters });
  return res.data;
}

export async function fetchIncome(id: number): Promise<IncomeDetail> {
  const res = await apiClient.get<IncomeDetail>(`/incomes/${id}/`);
  return res.data;
}

export async function createIncome(data: IncomeCreate): Promise<IncomeDetail> {
  const res = await apiClient.post<IncomeDetail>('/incomes/', data);
  return res.data;
}

export async function updateIncome(id: number, data: Partial<IncomeCreate>): Promise<IncomeDetail> {
  const res = await apiClient.patch<IncomeDetail>(`/incomes/${id}/`, data);
  return res.data;
}

export async function deleteIncome(id: number): Promise<void> {
  await apiClient.delete(`/incomes/${id}/`);
}

export async function fetchIncomeSummary(filters: Pick<IncomeFilters, 'date_after' | 'date_before'> = {}): Promise<IncomeSummary> {
  const res = await apiClient.get<IncomeSummary>('/incomes/summary/', { params: filters });
  return res.data;
}
