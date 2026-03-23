import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchInsights, generateInsights, markInsightRead, dismissInsight, updateMemory } from '@/api/insights';
import toast from 'react-hot-toast';

export function useInsights(params?: { insight_type?: string; is_dismissed?: boolean }) {
  return useQuery({
    queryKey: ['insights', params],
    queryFn: () => fetchInsights(params),
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

export function useGenerateInsights() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateInsights,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['insights'] });
      toast.success(`Generated ${data.generated} insights`);
    },
    onError: () => toast.error('Failed to generate insights'),
  });
}

export function useMarkInsightRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markInsightRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights'] });
    },
  });
}

export function useDismissInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dismissInsight,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['insights'] });
      toast.success('Insight dismissed');
    },
  });
}

export function useUpdateMemory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateMemory,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['insights'] });
      toast.success(data.message || 'Memory updated');
    },
    onError: () => toast.error('Failed to update memory'),
  });
}
