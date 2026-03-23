import apiClient from './client';
import type { AIInsight } from '@/types/insight';
import type { PaginatedResponse } from '@/types/api';

export async function fetchInsights(params?: {
  insight_type?: string;
  severity?: string;
  is_read?: boolean;
  is_dismissed?: boolean;
}): Promise<AIInsight[]> {
  const queryParams: Record<string, string> = { page_size: '50' };
  if (params?.insight_type) queryParams.insight_type = params.insight_type;
  if (params?.severity) queryParams.severity = params.severity;
  if (params?.is_read !== undefined) queryParams.is_read = String(params.is_read);
  if (params?.is_dismissed !== undefined) queryParams.is_dismissed = String(params.is_dismissed);

  const res = await apiClient.get<PaginatedResponse<AIInsight>>('/insights/', { params: queryParams });
  return res.data.results;
}

export async function generateInsights(): Promise<{ generated: number; insights: AIInsight[] }> {
  const res = await apiClient.post<{ generated: number; insights: AIInsight[] }>('/insights/generate/');
  return res.data;
}

export async function markInsightRead(id: number): Promise<AIInsight> {
  const res = await apiClient.post<AIInsight>(`/insights/${id}/read/`);
  return res.data;
}

export async function dismissInsight(id: number): Promise<AIInsight> {
  const res = await apiClient.post<AIInsight>(`/insights/${id}/dismiss/`);
  return res.data;
}

export async function updateMemory(): Promise<{ personality: string; new_facts: string[]; message: string }> {
  const res = await apiClient.post<{ personality: string; new_facts: string[]; message: string }>('/insights/update-memory/');
  return res.data;
}
