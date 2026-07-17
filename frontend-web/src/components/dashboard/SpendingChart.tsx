import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency } from '@/utils/format';

const BRAND_COLORS = [
  '#091D2A', // primary-950
  '#4DB86A', // accent-500
  '#E74C3C', // danger-500
  '#4787AF', // primary-400
  '#154360', // primary-700
  '#A3C3D7', // primary-200
];

interface SpendingChartProps {
  categories: { name: string; color: string; total: string }[];
  currency?: string;
}

export function SpendingChart({ categories, currency = 'NPR' }: SpendingChartProps) {
  const data = categories.map((c, i) => ({
    name: c.name,
    value: parseFloat(c.total),
    color: BRAND_COLORS[i % BRAND_COLORS.length],
  }));

  if (data.length === 0 || data.every((d) => d.value === 0)) {
    return (
      <p className="flex h-48 items-center justify-center text-[13px] text-primary-950/60 font-medium">
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
          innerRadius={60}
          outerRadius={85}
          paddingAngle={3}
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
            borderRadius: '8px',
            border: '1px solid rgba(9,29,42,0.07)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            fontSize: '13px',
            fontWeight: '700',
            color: '#091D2A',
            background: '#ffffff',
          }}
          itemStyle={{ color: '#091D2A', fontWeight: '800' }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}