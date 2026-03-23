import { Check, X, ArrowDownCircle, ArrowUpCircle, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { cn } from '@/utils/cn';
import { formatCurrency } from '@/utils/format';
import { useAuthStore } from '@/store/authStore';
import type { ActionData, ActionStatus, ActionResult } from '@/types/chat';

interface ActionCardProps {
  actions: ActionData[];
  status: ActionStatus;
  results?: { executed?: ActionResult[]; errors?: ActionResult[] };
  onConfirm: () => void;
  onReject: () => void;
  isConfirming: boolean;
  isRejecting: boolean;
}

const ACTION_LABELS: Record<string, string> = {
  create_expense: 'Log Expense',
  create_income: 'Log Income',
  update_expense: 'Edit Expense',
  delete_expense: 'Delete Expense',
  update_income: 'Edit Income',
  delete_income: 'Delete Income',
};

const ACTION_ICONS: Record<string, typeof ArrowDownCircle> = {
  create_expense: ArrowDownCircle,
  create_income: ArrowUpCircle,
  update_expense: Pencil,
  delete_expense: Trash2,
  update_income: Pencil,
  delete_income: Trash2,
};

export function ActionCard({ actions, status, results, onConfirm, onReject, isConfirming, isRejecting }: ActionCardProps) {
  const user = useAuthStore((s) => s.user);
  const currency = user?.preferred_currency || 'NPR';

  if (!actions || actions.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      {actions.map((action, idx) => {
        const Icon = ACTION_ICONS[action.type] || ArrowDownCircle;
        const label = ACTION_LABELS[action.type] || action.type;
        const isExpense = action.type.includes('expense');
        const isDelete = action.type.includes('delete');
        const isCreate = action.type.includes('create');

        // Get result for this action if confirmed
        const result = results?.executed?.[idx];
        const error = results?.errors?.find((e) => e.type === action.type);

        return (
          <div
            key={idx}
            className={cn(
              'rounded-lg border p-3 text-sm',
              status === 'confirmed' && 'border-accent-200 bg-accent-50',
              status === 'rejected' && 'border-primary-200 bg-primary-50 opacity-60',
              status === 'pending' && 'border-primary-200 bg-white',
            )}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <Icon className={cn(
                'h-4 w-4',
                isDelete ? 'text-danger-500' : isExpense ? 'text-danger-400' : 'text-accent-600',
              )} />
              <span className="font-medium text-primary-800">{label}</span>
              {status === 'confirmed' && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-accent-600">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
              {status === 'rejected' && (
                <span className="ml-auto inline-flex items-center gap-1 text-xs text-primary-400">
                  <X className="h-3 w-3" /> Cancelled
                </span>
              )}
              {error && (
                <span className="ml-auto text-xs text-danger-500">Failed: {error.error}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-primary-600">
              {action.data.amount != null && (
                <div>
                  <span className="text-primary-400">Amount: </span>
                  <span className="font-medium">{formatCurrency(action.data.amount, currency)}</span>
                </div>
              )}
              {action.data.category && (
                <div>
                  <span className="text-primary-400">Category: </span>
                  <span className="font-medium capitalize">{action.data.category}</span>
                </div>
              )}
              {action.data.merchant && (
                <div>
                  <span className="text-primary-400">Merchant: </span>
                  <span className="font-medium">{action.data.merchant}</span>
                </div>
              )}
              {action.data.source_name && (
                <div>
                  <span className="text-primary-400">Source: </span>
                  <span className="font-medium">{action.data.source_name}</span>
                </div>
              )}
              {action.data.description && (
                <div className="col-span-2">
                  <span className="text-primary-400">Note: </span>
                  <span>{action.data.description}</span>
                </div>
              )}
              {action.data.date && (
                <div>
                  <span className="text-primary-400">Date: </span>
                  <span>{action.data.date}</span>
                </div>
              )}
              {(action.data.expense_id || action.data.income_id) && (
                <div>
                  <span className="text-primary-400">ID: </span>
                  <span>#{action.data.expense_id || action.data.income_id}</span>
                </div>
              )}
            </div>

            {/* Confirmed result details */}
            {status === 'confirmed' && result && isCreate && result.id && (
              <p className="mt-1.5 text-xs text-accent-600">
                Saved as #{result.id}
              </p>
            )}
          </div>
        );
      })}

      {/* Confirm / Cancel buttons */}
      {status === 'pending' && (
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="accent"
            size="sm"
            onClick={onConfirm}
            loading={isConfirming}
            disabled={isRejecting}
          >
            <Check className="h-3.5 w-3.5" /> Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onReject}
            loading={isRejecting}
            disabled={isConfirming}
          >
            <X className="h-3.5 w-3.5" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
