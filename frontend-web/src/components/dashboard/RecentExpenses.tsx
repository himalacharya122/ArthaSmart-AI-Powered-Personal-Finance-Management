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
          <tr className="border-b border-border text-left text-xs font-semibold uppercase tracking-wide text-primary-secondary">
            <th className="pb-4 pr-4">Date</th>
            <th className="pb-4 pr-4">Description</th>
            <th className="pb-4 pr-4">Category</th>
            <th className="pb-4 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp) => (
            <tr
              key={exp.id}
              className="border-b border-border/50 last:border-0 cursor-pointer transition-colors hover:bg-surface-hover"
              onClick={() => navigate('/expenses')}
            >
              <td className="py-4 pr-4 text-primary-secondary font-medium">{formatDate(exp.date, 'dd MMM')}</td>
              <td className="py-4 pr-4 font-semibold text-primary-text">
                {exp.description || exp.merchant || 'Untitled'}
              </td>
              <td className="py-4 pr-4">
                <span className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full flex-shrink-0 animate-pulse"
                    style={{ 
                      backgroundColor: exp.category_color || '#00d4aa',
                      boxShadow: `0 0 8px ${exp.category_color || '#00d4aa'}`
                    }}
                  />
                  <span className="text-primary-secondary font-medium">{exp.category_name || 'Uncategorized'}</span>
                </span>
              </td>
              <td className="py-4 text-right font-bold text-accent-red number-font">
                {formatCurrency(exp.amount, exp.currency || currency)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}