import { useQuery } from '@tanstack/react-query';
import { fetchSpendingByCategory } from '@/api/reports';

export function useSpendingByCategory(dateAfter?: string, dateBefore?: string) {
  return useQuery({
    queryKey: ['spending-by-category', dateAfter, dateBefore],
    queryFn: () => fetchSpendingByCategory(dateAfter, dateBefore),
  });
}
