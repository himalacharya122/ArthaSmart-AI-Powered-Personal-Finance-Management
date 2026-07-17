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
      <div className="relative overflow-hidden bg-white p-6 border border-[rgba(9,29,42,0.07)] shadow-sm" style={{ borderRadius: '16px' }}>
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div 
      className={cn(
        "group relative overflow-hidden bg-white p-6",
        "border border-[rgba(9,29,42,0.07)] shadow-sm"
      )} 
      style={{ borderRadius: '16px' }}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[12px] font-[700] uppercase tracking-wider text-primary-950/60">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F6F7F9] text-primary-950">
            {icon}
          </div>
        </div>
        <p className="text-[26px] font-[800] tracking-[-0.03em] text-primary-950">{value}</p>
        {trend && (
          <p className={cn('mt-2 text-[12px] font-[700]', trendUp ? 'text-accent-500' : 'text-danger-500')}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}