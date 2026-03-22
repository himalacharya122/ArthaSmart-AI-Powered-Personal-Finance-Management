import apiClient from './client';
import type { Category, CategoryCreate } from '@/types/category';
import type { PaginatedResponse } from '@/types/api';

export async function fetchCategories(type?: 'expense' | 'income'): Promise<PaginatedResponse<Category>> {
  const params: Record<string, string> = { page_size: '100' };
  if (type) params.type = type;
  const res = await apiClient.get<PaginatedResponse<Category>>('/categories/', { params });
  return res.data;
}

export async function createCategory(data: CategoryCreate): Promise<Category> {
  const res = await apiClient.post<Category>('/categories/', data);
  return res.data;
}

export async function updateCategory(id: number, data: Partial<CategoryCreate>): Promise<Category> {
  const res = await apiClient.patch<Category>(`/categories/${id}/`, data);
  return res.data;
}

export async function deleteCategory(id: number): Promise<void> {
  await apiClient.delete(`/categories/${id}/`);
}
