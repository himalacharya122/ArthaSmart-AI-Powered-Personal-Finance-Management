import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/format';

const MUTED_COLORS = [
  '#1e3a8a', // Navy
  '#15803d', // Forest Green
  '#b45309', // Amber
  '#57534e', // Warm Gray
  '#0f766e', // Teal
  '#78716c', // Light Warm Gray
];

interface SpendingChartProps {
  categories: { name: string; color: string; total: string }[];
  currency?: string;
}

export function SpendingChart({ categories, currency = 'NPR' }: SpendingChartProps) {
  const data = categories.map((c, i) => ({
    name: c.name,
    value: parseFloat(c.total),
    color: MUTED_COLORS[i % MUTED_COLORS.length],
  }));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-[#78716c]">
        No spending data yet
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
          dataKey="value"
          stroke="none"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value), currency)}
          contentStyle={{
            borderRadius: '4px',
            border: '1px solid #e7e5e4',
            boxShadow: '0 4px 6px -1px rgba(41, 37, 36, 0.1)',
            fontSize: '14px',
            fontWeight: '600',
            color: '#292524',
            background: '#fafaf9',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}