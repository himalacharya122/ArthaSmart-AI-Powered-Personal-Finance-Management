import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { IncomeVsExpenseMonth } from '@/types/report';

interface IncomeExpenseChartProps {
  data: IncomeVsExpenseMonth[];
}

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  if (data.length === 0) {
    return (
      <p className="flex h-48 items-center justify-center text-sm text-primary-950/50">
        No data yet
      </p>
    );
  }

  const chartData = data.map((d) => ({
    month: d.month,
    Income: parseFloat(d.income),
    Expenses: parseFloat(d.expense),
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={chartData} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2d3349" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#8b92ab' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#8b92ab' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
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
          cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }}
          formatter={(value) => <span style={{ color: '#8b92ab' }}>{value}</span>}
        />
        <Bar dataKey="Income" fill="#00d4aa" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#ff4757" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}