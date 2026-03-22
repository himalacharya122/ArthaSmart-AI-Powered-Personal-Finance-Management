import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchBudgets, createBudget, updateBudget, deleteBudget } from '@/api/budgets';
import type { BudgetFilters, BudgetCreate } from '@/types/budget';
import toast from 'react-hot-toast';

export function useBudgets(filters: BudgetFilters = {}) {
  return useQuery({
    queryKey: ['budgets', filters],
    queryFn: () => fetchBudgets(filters),
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BudgetCreate) => createBudget(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Budget created');
    },
    onError: () => toast.error('Failed to create budget'),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<BudgetCreate> }) => updateBudget(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Budget updated');
    },
    onError: () => toast.error('Failed to update budget'),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteBudget(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Budget deleted');
    },
    onError: () => toast.error('Failed to delete budget'),
  });
}
