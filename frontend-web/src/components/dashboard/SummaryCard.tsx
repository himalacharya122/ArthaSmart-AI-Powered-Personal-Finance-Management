import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/common/LoadingSkeleton';

interface SummaryCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
  loading?: boolean;
}

export function SummaryCard({ label, value, icon, trend, trendUp, loading }: SummaryCardProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-primary-950/20 bg-white p-5">
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary-950/20 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-primary-950/70">{label}</p>
        <div className="text-primary-950/40">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-primary-950">{value}</p>
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', trendUp ? 'text-accent-600' : 'text-danger-500')}>
          {trend}
        </p>
      )}
    </div>
  );
}