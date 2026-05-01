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
      <div className="crypto-card p-5 relative overflow-hidden">
        <Skeleton className="mb-3 h-4 w-24 opacity-20" />
        <Skeleton className="mb-2 h-8 w-32 opacity-20" />
        <Skeleton className="h-3 w-20 opacity-10" />
      </div>
    );
  }

  return (
    <div className="crypto-card p-5 relative group overflow-hidden">
      {/* Background radial gradient overlay */}
      <div className={cn(
        "absolute -right-10 -top-10 h-32 w-32 rounded-full blur-3xl opacity-10 transition-opacity group-hover:opacity-20",
        trendUp ? "bg-accent-green" : "bg-accent-red"
      )} />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-primary-secondary">{label}</p>
          <div className={cn(
            "flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br transition-transform group-hover:scale-110",
            trendUp 
              ? "from-accent-green/20 to-blue-500/20 text-accent-green shadow-glow-green" 
              : "from-accent-red/20 to-orange-500/20 text-accent-red shadow-glow-red"
          )}>
            {icon}
          </div>
        </div>
        <p className="mt-2 text-3xl font-bold text-primary-text number-font">{value}</p>
        {trend && (
          <p className={cn('mt-2 text-xs font-medium inline-flex items-center gap-1 rounded-full px-2 py-0.5', 
            trendUp ? 'bg-accent-green/10 text-accent-green' : 'bg-accent-red/10 text-accent-red'
          )}>
            <span className={cn("h-1 w-1 rounded-full animate-pulse", trendUp ? "bg-accent-green" : "bg-accent-red")} />
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}