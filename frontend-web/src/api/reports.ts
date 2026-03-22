import apiClient from './client';
import type { DashboardData, IncomeVsExpenseMonth, IncomeVsExpenseResponse } from '@/types/report';

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await apiClient.get<DashboardData>('/reports/dashboard/');
  return res.data;
}

export async function fetchIncomeVsExpense(months = 6): Promise<IncomeVsExpenseMonth[]> {
  const res = await apiClient.get<IncomeVsExpenseResponse>('/reports/income-vs-expense/', {
    params: { months },
  });
  return res.data.monthly_data;
}

export interface SpendingCategory {
  category_id: number | null;
  name: string;
  color: string;
  icon: string;
  total: string;
  count: number;
}

export async function fetchSpendingByCategory(dateAfter?: string, dateBefore?: string): Promise<SpendingCategory[]> {
  const params: Record<string, string> = {};
  if (dateAfter) params.date_after = dateAfter;
  if (dateBefore) params.date_before = dateBefore;
  const res = await apiClient.get<{ categories: SpendingCategory[] }>('/reports/spending-by-category/', { params });
  return res.data.categories;
}

export async function exportCsv(type: 'expenses' | 'incomes', dateFrom?: string, dateTo?: string): Promise<Blob> {
  const params: Record<string, string> = { type };
  if (dateFrom) params.date_from = dateFrom;
  if (dateTo) params.date_to = dateTo;
  const res = await apiClient.get('/reports/export/', {
    params,
    responseType: 'blob',
  });
  return res.data as Blob;
}
