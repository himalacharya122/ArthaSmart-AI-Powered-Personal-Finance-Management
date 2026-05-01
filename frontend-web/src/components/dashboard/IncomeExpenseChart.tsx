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
      <p className="flex h-48 items-center justify-center text-sm text-[#78716c]">
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
      <BarChart data={chartData} barGap={6}>
        <defs>
          <linearGradient id="incomeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#15803d" stopOpacity={1} />
            <stop offset="100%" stopColor="#15803d" stopOpacity={0.8} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1e3a8a" stopOpacity={1} />
            <stop offset="100%" stopColor="#1e3a8a" stopOpacity={0.8} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 13, fill: '#78716c', fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fontSize: 13, fill: '#78716c', fontWeight: 500 }}
          axisLine={{ stroke: '#e7e5e4' }}
          tickLine={false}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '4px',
            border: '1px solid #e7e5e4',
            boxShadow: '0 4px 6px -1px rgba(41, 37, 36, 0.1)',
            fontSize: '14px',
            fontWeight: '600',
            color: '#292524',
            background: '#fafaf9',
          }}
          cursor={{ fill: 'rgba(120, 113, 108, 0.05)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '13px', fontWeight: '500', color: '#78716c', paddingTop: '16px' }}
          iconType="circle"
        />
        <Bar dataKey="Income" fill="url(#incomeFill)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="url(#expenseFill)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}