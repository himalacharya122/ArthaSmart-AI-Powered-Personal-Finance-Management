import { formatCurrency, formatDate } from '@/utils/format';
import type { DashboardData } from '@/types/report';

interface RecentExpensesProps {
  expenses: DashboardData['recent_expenses'];
  currency?: string;
}

const MUTED_COLORS = [
  'bg-primary-950',
  'bg-accent-500',
  'bg-danger-500',
  'bg-primary-400',
  'bg-primary-700',
];

export function RecentExpenses({ expenses, currency = 'NPR' }: RecentExpensesProps) {

  if (expenses.length === 0) {
    return (
      <p className="py-6 text-center text-[13px] text-primary-950/60 font-medium">No expenses yet</p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[rgba(9,29,42,0.07)] text-left text-[11px] font-[700] uppercase tracking-wider text-primary-950/60">
            <th className="pb-3 pl-2 pr-4">Date</th>
            <th className="pb-3 pr-4">Description</th>
            <th className="pb-3 pr-4">Category</th>
            <th className="pb-3 pr-2 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((exp, i) => {
            const colorClass = MUTED_COLORS[i % MUTED_COLORS.length];
            return (
              <tr
                key={exp.id}
                className="border-b border-[rgba(9,29,42,0.07)] last:border-0"
              >
                <td className="py-3 pl-2 pr-4 text-primary-950/60 font-medium">{formatDate(exp.date, 'dd MMM')}</td>
                <td className="py-3 pr-4 font-[700] text-primary-950">
                  {exp.description || exp.merchant || 'Untitled'}
                </td>
                <td className="py-3 pr-4">
                  <span className="inline-flex items-center gap-2">
                    <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${colorClass}`} />
                    <span className="text-primary-950/60 font-medium">{exp.category_name || 'Uncategorized'}</span>
                  </span>
                </td>
                <td className="py-3 pr-2 text-right">
                  <span className="inline-flex items-center text-[13px] font-[800] text-primary-950 tracking-tight">
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