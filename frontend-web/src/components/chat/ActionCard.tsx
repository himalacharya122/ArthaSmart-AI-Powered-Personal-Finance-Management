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
              'rounded-xl border p-4 text-sm transition-all',
              status === 'confirmed' && 'border-accent-200 bg-accent-50/50',
              status === 'rejected' && 'border-[rgba(9,29,42,0.07)] bg-[#F6F7F9] opacity-60',
              status === 'pending' && 'border-[rgba(9,29,42,0.1)] bg-white shadow-sm',
            )}
          >
            <div className="flex items-center gap-2 mb-2">
              <Icon className={cn(
                'h-4 w-4',
                isDelete ? 'text-danger-500' : isExpense ? 'text-danger-500' : 'text-accent-600',
              )} />
              <span className="font-[700] text-primary-950">{label}</span>
              {status === 'confirmed' && (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-[700] text-accent-600 uppercase tracking-wider">
                  <Check className="h-3 w-3" /> Saved
                </span>
              )}
              {status === 'rejected' && (
                <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-[700] text-primary-950/40 uppercase tracking-wider">
                  <X className="h-3 w-3" /> Cancelled
                </span>
              )}
              {error && (
                <span className="ml-auto text-[11px] font-[700] text-danger-500 uppercase tracking-wider">Failed: {error.error}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] text-primary-950/70 font-medium">
              {action.data.amount != null && (
                <div>
                  <span className="text-primary-950/40">Amount: </span>
                  <span className="font-[800] text-primary-950">{formatCurrency(action.data.amount, currency)}</span>
                </div>
              )}
              {action.data.category && (
                <div>
                  <span className="text-primary-950/40">Category: </span>
                  <span className="font-semibold text-primary-950 capitalize">{action.data.category}</span>
                </div>
              )}
              {action.data.merchant && (
                <div>
                  <span className="text-primary-950/40">Merchant: </span>
                  <span className="font-semibold text-primary-950">{action.data.merchant}</span>
                </div>
              )}
              {action.data.source_name && (
                <div>
                  <span className="text-primary-950/40">Source: </span>
                  <span className="font-semibold text-primary-950">{action.data.source_name}</span>
                </div>
              )}
              {action.data.description && (
                <div className="col-span-2">
                  <span className="text-primary-950/40">Note: </span>
                  <span className="text-primary-950">{action.data.description}</span>
                </div>
              )}
              {action.data.date && (
                <div>
                  <span className="text-primary-950/40">Date: </span>
                  <span className="text-primary-950">{action.data.date}</span>
                </div>
              )}
              {(action.data.expense_id || action.data.income_id) && (
                <div>
                  <span className="text-primary-950/40">ID: </span>
                  <span className="text-primary-950">#{action.data.expense_id || action.data.income_id}</span>
                </div>
              )}
            </div>

            {/* Confirmed result details */}
            {status === 'confirmed' && result && isCreate && result.id && (
              <p className="mt-2 text-[11px] font-[700] text-accent-600 uppercase tracking-wider">
                Logged as transaction #{result.id}
              </p>
            )}
          </div>
        );
      })}

      {/* Confirm / Cancel buttons */}
      {status === 'pending' && (
        <div className="flex items-center gap-2 pt-2">
          <Button
            variant="accent"
            size="sm"
            className="rounded-lg h-9 font-bold"
            onClick={onConfirm}
            loading={isConfirming}
            disabled={isRejecting}
          >
            <Check className="h-4 w-4" /> Confirm
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-lg h-9 font-bold text-primary-950/60 hover:text-primary-950"
            onClick={onReject}
            loading={isRejecting}
            disabled={isConfirming}
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
