import { formatCurrency } from '@/utils/format';

interface TopCategoriesProps {
  categories: { name: string; color: string; icon: string; total: string }[];
  currency?: string;
}

const BRAND_COLORS = [
  '#091D2A', // primary-950
  '#4DB86A', // accent-500
  '#E74C3C', // danger-500
  '#4787AF', // primary-400
  '#154360', // primary-700
];

export function TopCategories({ categories, currency = 'NPR' }: TopCategoriesProps) {
  if (categories.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-primary-950/60 font-medium">No category data yet</p>
    );
  }

  const maxTotal = Math.max(...categories.map((c) => parseFloat(c.total)));

  return (
    <div className="space-y-5">
      {categories.map((cat, i) => {
        const pct = maxTotal > 0 ? (parseFloat(cat.total) / maxTotal) * 100 : 0;
        const color = BRAND_COLORS[i % BRAND_COLORS.length];
        return (
          <div key={cat.name}>
            <div className="flex items-center justify-between text-sm mb-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-[700] text-primary-950">{cat.name}</span>
              </div>
              <span className="font-[800] text-primary-950 tracking-tight">
                {formatCurrency(cat.total, currency)}
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[rgba(9,29,42,0.07)]">
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