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
    <div className="space-y-3">
      {categories.map((cat) => {
        const pct = maxTotal > 0 ? (parseFloat(cat.total) / maxTotal) * 100 : 0;
        return (
          <div key={cat.name}>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: cat.color || '#4787AF' }}
                />
                <span className="font-semibold text-primary-950">{cat.name}</span>
              </div>
              <span className="font-medium text-primary-950/70">
                {formatCurrency(cat.total, currency)}
              </span>
            </div>
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-primary-950/10">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: cat.color || '#4787AF' }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}