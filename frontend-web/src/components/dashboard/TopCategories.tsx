import { formatCurrency } from '@/utils/format';

interface TopCategoriesProps {
  categories: { name: string; color: string; icon: string; total: string }[];
  currency?: string;
}

const MUTED_COLORS = [
  '#1e3a8a', // Navy
  '#15803d', // Forest Green
  '#b45309', // Amber
  '#57534e', // Warm Gray
  '#0f766e', // Teal
];

export function TopCategories({ categories, currency = 'NPR' }: TopCategoriesProps) {
  if (categories.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[#78716c]">No category data yet</p>
    );
  }

  const maxTotal = Math.max(...categories.map((c) => parseFloat(c.total)));

  return (
    <div className="space-y-4">
      {categories.map((cat, i) => {
        const pct = maxTotal > 0 ? (parseFloat(cat.total) / maxTotal) * 100 : 0;
        const color = MUTED_COLORS[i % MUTED_COLORS.length];
        return (
          <div key={cat.name}>
            <div className="flex items-center justify-between text-sm mb-1.5">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-semibold text-[#292524]">{cat.name}</span>
              </div>
              <span className="font-medium text-[#78716c]">
                {formatCurrency(cat.total, currency)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#e7e5e4]">
              <div
                className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}