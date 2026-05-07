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
      <p className="flex h-48 items-center justify-center text-[13px] text-primary-950/60 font-medium">
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
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(9,29,42,0.07)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 12, fill: '#091D2A', fontWeight: 600, opacity: 0.6 }}
          axisLine={false}
          tickLine={false}
          dy={10}
        />
        <YAxis
          tick={{ fontSize: 12, fill: '#091D2A', fontWeight: 600, opacity: 0.6 }}
          axisLine={{ stroke: 'rgba(9,29,42,0.07)' }}
          tickLine={false}
          dx={-10}
        />
        <Tooltip
          contentStyle={{
            borderRadius: '8px',
            border: '1px solid rgba(9,29,42,0.07)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            fontSize: '13px',
            fontWeight: '700',
            color: '#091D2A',
            background: '#ffffff',
          }}
          cursor={{ fill: 'rgba(9,29,42,0.03)' }}
          itemStyle={{ color: '#091D2A', fontWeight: '800' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', fontWeight: '700', color: '#091D2A', opacity: 0.8, paddingTop: '16px' }}
          iconType="circle"
        />
        <Bar dataKey="Income" fill="#4DB86A" radius={[4, 4, 0, 0]} />
        <Bar dataKey="Expenses" fill="#E74C3C" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}