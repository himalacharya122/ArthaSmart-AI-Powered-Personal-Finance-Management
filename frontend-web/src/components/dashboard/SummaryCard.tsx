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
      <div className="relative overflow-hidden rounded bg-[#f5f5f4] p-6 border border-[#e7e5e4]">
        <Skeleton className="mb-3 h-4 w-24" />
        <Skeleton className="mb-2 h-8 w-32" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div className="group relative overflow-hidden rounded bg-[#f5f5f4] p-6 transition-all duration-300 border border-[#e7e5e4] shadow-sm hover:shadow-md hover:border-[#1e3a8a]/30 hover:-translate-y-0.5">
      <div className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold tracking-wide text-[#78716c] uppercase">{label}</p>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1e3a8a] text-white shadow-inner ring-2 ring-[#eab308]/50 ring-inset">
            {icon}
          </div>
        </div>
        <p className="mt-4 text-3xl font-bold text-[#292524] tracking-tight">{value}</p>
        {trend && (
          <p className={cn('mt-2 text-sm font-medium', trendUp ? 'text-[#15803d]' : 'text-[#dc2626]')}>
            {trend}
          </p>
        )}
      </div>
    </div>
  );
}