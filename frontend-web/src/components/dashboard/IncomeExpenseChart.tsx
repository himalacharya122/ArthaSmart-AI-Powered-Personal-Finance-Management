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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(9,29,42,0.1)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: 'rgba(9,29,42,0.6)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 12, fill: 'rgba(9,29,42,0.6)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid rgba(9,29,42,0.2)',
            fontSize: '13px',
            color: '#091D2A',
          }}
          cursor={{ fill: 'rgba(9,29,42,0.04)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '13px', color: 'rgba(9,29,42,0.7)' }}
        />
        <Bar dataKey="Income" fill="#3A9E55" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#091D2A" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}