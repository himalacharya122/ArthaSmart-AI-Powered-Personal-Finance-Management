import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/format';

interface SpendingChartProps {
  categories: { name: string; color: string; total: string }[];
  currency?: string;
}

export function SpendingChart({ categories, currency = 'NPR' }: SpendingChartProps) {
  const data = categories.map((c) => ({
    name: c.name,
    value: parseFloat(c.total),
    color: c.color || '#94a3b8',
  }));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return <p className="flex h-48 items-center justify-center text-sm text-primary-400">No spending data yet</p>;
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
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell key={entry.name} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value) => formatCurrency(Number(value), currency)}
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            fontSize: '13px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
