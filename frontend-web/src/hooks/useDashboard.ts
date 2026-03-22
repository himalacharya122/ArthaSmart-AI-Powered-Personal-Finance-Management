import { useQuery } from '@tanstack/react-query';
import { fetchDashboard, fetchIncomeVsExpense } from '@/api/reports';

export function useDashboard() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });
}

export function useIncomeVsExpense(months = 6) {
  return useQuery({
    queryKey: ['income-vs-expense', months],
    queryFn: () => fetchIncomeVsExpense(months),
  });
}
