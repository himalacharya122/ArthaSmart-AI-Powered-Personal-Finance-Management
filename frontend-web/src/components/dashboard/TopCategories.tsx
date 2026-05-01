import { formatCurrency } from '@/utils/format';

interface TopCategoriesProps {
  categories: { name: string; color: string; icon: string; total: string }[];
  currency?: string;
}

export function TopCategories({ categories, currency = 'NPR' }: TopCategoriesProps) {
  if (categories.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-primary-950/50">No category data yet</p>
    );
  }

  const maxTotal = Math.max(...categories.map((c) => parseFloat(c.total)));

  return (
    <div className="space-y-6">
      {categories.map((cat) => {
        const pct = maxTotal > 0 ? (parseFloat(cat.total) / maxTotal) * 100 : 0;
        return (
          <div key={cat.name} className="group">
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-3 w-3 flex-shrink-0 rounded-full animate-pulse"
                  style={{ 
                    backgroundColor: cat.color || '#00d4aa',
                    boxShadow: `0 0 10px ${cat.color || '#00d4aa'}80`
                  }}
                />
                <span className="font-semibold text-primary-text group-hover:text-accent-green transition-colors">{cat.name}</span>
              </div>
              <span className="font-bold text-primary-secondary number-font">
                {formatCurrency(cat.total, currency)}
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-border overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                style={{ 
                  width: `${pct}%`, 
                  backgroundColor: cat.color || '#00d4aa',
                  boxShadow: `0 0 15px ${cat.color || '#00d4aa'}40`
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}