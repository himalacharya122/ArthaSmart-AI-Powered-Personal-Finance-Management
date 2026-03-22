import { Pencil, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';
import { formatCurrency, formatPercentage } from '@/utils/format';
import type { Budget } from '@/types/budget';

interface BudgetCardProps {
  budget: Budget;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function BudgetCard({ budget, currency, onEdit, onDelete }: BudgetCardProps) {
  const pct = budget.percentage_used;
  const barColor =
    pct >= 100 ? 'bg-danger-500' : pct >= budget.alert_threshold ? 'bg-warning-500' : 'bg-accent-500';

  return (
    <div className="rounded-lg border border-primary-100 bg-card p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-primary-800">{budget.name}</h3>
          {budget.category && (
            <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary-400">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: budget.category.color || '#94a3b8' }}
              />
              {budget.category.name}
            </span>
          )}
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={onDelete} className="rounded p-1 text-primary-400 hover:bg-danger-50 hover:text-danger-500">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div className="mt-4 flex items-end justify-between text-sm">
        <span className="text-primary-500">
          {formatCurrency(budget.spent, currency)} of {formatCurrency(budget.amount, currency)}
        </span>
        <span className={cn('font-semibold', pct >= 100 ? 'text-danger-500' : 'text-primary-700')}>
          {formatPercentage(pct)}
        </span>
      </div>

      {/* Progress bar */}
      <div className="mt-2 h-2 w-full rounded-full bg-primary-100">
        <div
          className={cn('h-2 rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between text-xs text-primary-400">
        <span className="capitalize">{budget.period}</span>
        {budget.is_over_budget && (
          <span className="inline-flex items-center gap-1 font-medium text-danger-500">
            <AlertTriangle className="h-3 w-3" />
            Over budget
          </span>
        )}
        {!budget.is_over_budget && (
          <span>{formatCurrency(budget.remaining, currency)} remaining</span>
        )}
      </div>
    </div>
  );
}
