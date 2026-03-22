import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchIncomes, createIncome, updateIncome, deleteIncome, fetchIncomeSummary } from '@/api/incomes';
import type { IncomeFilters, IncomeCreate } from '@/types/income';
import toast from 'react-hot-toast';

export function useIncomes(filters: IncomeFilters = {}) {
  return useQuery({
    queryKey: ['incomes', filters],
    queryFn: () => fetchIncomes(filters),
  });
}

export function useIncomeSummary(filters: Pick<IncomeFilters, 'date_after' | 'date_before'> = {}) {
  return useQuery({
    queryKey: ['income-summary', filters],
    queryFn: () => fetchIncomeSummary(filters),
  });
}

export function useCreateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: IncomeCreate) => createIncome(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incomes'] });
      qc.invalidateQueries({ queryKey: ['income-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Income added');
    },
    onError: () => toast.error('Failed to add income'),
  });
}

export function useUpdateIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<IncomeCreate> }) => updateIncome(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incomes'] });
      qc.invalidateQueries({ queryKey: ['income-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Income updated');
    },
    onError: () => toast.error('Failed to update income'),
  });
}

export function useDeleteIncome() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteIncome(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incomes'] });
      qc.invalidateQueries({ queryKey: ['income-summary'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Income deleted');
    },
    onError: () => toast.error('Failed to delete income'),
  });
}
