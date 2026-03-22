import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatDate } from '@/utils/format';
import type { DashboardData } from '@/types/report';

interface RecentExpensesProps {
  expenses: DashboardData['recent_expenses'];
  currency?: string;
}

export function RecentExpenses({ expenses, currency = 'NPR' }: RecentExpensesProps) {
  const navigate = useNavigate();

  if (expenses.length === 0) {
    return <p className="py-6 text-center text-sm text-primary-400">No expenses yet</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary-100 text-left text-xs font-semibold uppercase text-primary-400">
            <th className="pb-2 pr-4">Date</th>
            <th className="pb-2 pr-4">Description</th>
            <th className="pb-2 pr-4">Category</th>
            <th className="pb-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr
              key={exp.id}
              className="border-b border-primary-50 last:border-0 cursor-pointer hover:bg-primary-50/50"
              onClick={() => navigate('/expenses')}
            >
              <td className="py-2.5 pr-4 text-primary-500">{formatDate(exp.date, 'dd MMM')}</td>
              <td className="py-2.5 pr-4 font-medium text-primary-800">
                {exp.description || exp.merchant || 'Untitled'}
              </td>
              <td className="py-2.5 pr-4">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: exp.category_color || '#94a3b8' }}
                  />
                  <span className="text-primary-500">{exp.category_name || 'Uncategorized'}</span>
                </span>
              </td>
              <td className="py-2.5 text-right font-medium text-danger-500">
                -{formatCurrency(exp.amount, exp.currency || currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
