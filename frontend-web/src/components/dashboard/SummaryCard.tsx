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
      <div className="rounded-lg border border-primary-100 bg-card p-5 shadow-sm">
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-primary-100 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-primary-400">{label}</p>
        <div className="text-primary-300">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-primary-800">{value}</p>
      {trend && (
        <p className={cn('mt-1 text-xs font-medium', trendUp ? 'text-accent-600' : 'text-danger-500')}>
          {trend}
        </p>
      )}
    </div>
  );
}
