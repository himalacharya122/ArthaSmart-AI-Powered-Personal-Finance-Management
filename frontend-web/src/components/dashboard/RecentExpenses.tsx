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
    return (
      <p className="py-6 text-center text-sm text-primary-950/50">No expenses yet</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-primary-950/20 text-left text-xs font-semibold uppercase tracking-wide text-primary-950/70">
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
              className="border-b border-primary-950/10 last:border-0 cursor-pointer hover:bg-primary-50"
              onClick={() => navigate('/expenses')}
            >
              <td className="py-2.5 pr-4 text-primary-950/60 font-medium">{formatDate(exp.date, 'dd MMM')}</td>
              <td className="py-2.5 pr-4 font-semibold text-primary-950">
                {exp.description || exp.merchant || 'Untitled'}
              </td>
              <td className="py-2.5 pr-4">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-block h-2 w-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: exp.category_color || '#4787AF' }}
                  />
                  <span className="text-primary-950/70 font-medium">{exp.category_name || 'Uncategorized'}</span>
                </span>
              </td>
              <td className="py-2.5 text-right font-semibold text-danger-500">
                {formatCurrency(exp.amount, exp.currency || currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}