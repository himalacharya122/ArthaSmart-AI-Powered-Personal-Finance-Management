import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/utils/format';
import type { DashboardData } from '@/types/report';

interface RecentExpensesProps {
  expenses: DashboardData['recent_expenses'];
  currency?: string;
}

const MUTED_COLORS = [
  'bg-[#1e3a8a]', // Navy
  'bg-[#15803d]', // Forest Green
  'bg-[#b45309]', // Amber/Brown
  'bg-[#57534e]', // Warm Gray
  'bg-[#0f766e]', // Teal
];

export function RecentExpenses({ expenses, currency = 'NPR' }: RecentExpensesProps) {
  const navigate = useNavigate();

  if (expenses.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[#78716c]">No expenses yet</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e7e5e4] text-left text-xs font-semibold uppercase tracking-wider text-[#78716c]">
            <th className="pb-3 pl-2 pr-4 font-semibold">Date</th>
            <th className="pb-3 pr-4 font-semibold">Description</th>
            <th className="pb-3 pr-4 font-semibold">Category</th>
            <th className="pb-3 pr-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp, i) => {
            const colorClass = MUTED_COLORS[i % MUTED_COLORS.length];
            return (
              <tr
                key={exp.id}
                className={`border-b border-[#e7e5e4] last:border-0 cursor-pointer transition-colors ${
                  i % 2 === 0 ? 'bg-white' : 'bg-[#f5f5f4]'
                } hover:bg-[#e7e5e4]/50`}
                onClick={() => navigate('/expenses')}
              >
                <td className="py-3 pl-2 pr-4 text-[#78716c] font-medium">{formatDate(exp.date, 'dd MMM')}</td>
                <td className="py-3 pr-4 font-semibold text-[#292524]">
                  {exp.description || exp.merchant || 'Untitled'}
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${colorClass}`}
                    />
                    <span className="text-[#78716c] font-medium">{exp.category_name || 'Uncategorized'}</span>
                  </span>
                </td>
                <td className="py-3 pr-2 text-right">
                  <span className="inline-flex items-center rounded-full bg-[#fce7f3] px-2.5 py-0.5 text-sm font-semibold text-[#9d174d]">
                    {formatCurrency(exp.amount, exp.currency || currency)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}