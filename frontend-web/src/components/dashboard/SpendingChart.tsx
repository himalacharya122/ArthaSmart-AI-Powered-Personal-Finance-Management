import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/format';

const FALLBACK_COLORS = [
  '#091D2A', // primary-950
  '#1F6F8B', // primary-500
  '#4787AF', // primary-400
  '#75A5C3', // primary-300
  '#3A9E55', // accent-600
  '#7DD89A', // accent-300
];

interface SpendingChartProps {
  categories: { name: string; color: string; total: string }[];
  currency?: string;
}

export function SpendingChart({ categories, currency = 'NPR' }: SpendingChartProps) {
  const data = categories.map((c, i) => ({
    name: c.name,
    value: parseFloat(c.total),
    color: c.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
  }));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-primary-950/50">
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
            backgroundColor: 'rgba(26, 31, 53, 0.8)',
            backdropFilter: 'blur(8px)',
            borderRadius: '12px',
            border: '1px solid #2d3349',
            fontSize: '13px',
            color: '#ffffff',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
          }}
          itemStyle={{ color: '#ffffff' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}