import { useForm } from 'react-hook-form';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { ExpenseCreate } from '@/types/expense';
import type { Expense } from '@/types/expense';

interface ExpenseFormProps {
  expense?: Expense | null;
  loading?: boolean;
  onSubmit: (data: ExpenseCreate) => void;
  onCancel: () => void;
}

export function ExpenseForm({ expense, loading, onSubmit, onCancel }: ExpenseFormProps) {
  const { data: catData } = useCategories('expense');
  const categories = catData?.results || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ExpenseCreate>({
    defaultValues: expense
      ? {
          amount: expense.amount,
          description: expense.description,
          merchant: expense.merchant,
          date: expense.date,
          time: expense.time || '',
          category_id: expense.category?.id ?? undefined,
        }
      : {
          date: new Date().toISOString().split('T')[0],
          currency: 'NPR',
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Amount"
          type="number"
          step="0.01"
          placeholder="0.00"
          error={errors.amount?.message}
          {...register('amount', { required: 'Amount is required' })}
        />
        <div className="space-y-1">
          <label className="block text-sm font-bold text-primary-950/80">
            Category
          </label>
          <select
            className="mt-2 block w-full rounded-md border border-primary-950/20 bg-white py-3 px-3 text-sm text-primary-950 focus:border-primary-950/40 focus:outline-none focus:ring-0 transition-colors"
            {...register('category_id', { setValueAs: (v) => (v ? Number(v) : null) })}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Input
        label="Description"
        placeholder="e.g. Lunch at British Cafe"
        error={errors.description?.message}
        {...register('description')}
      />

      <Input
        label="Merchant"
        placeholder="e.g. British Cafe"
        {...register('merchant')}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Date"
          type="date"
          error={errors.date?.message}
          {...register('date', { required: 'Date is required' })}
        />
        <Input
          label="Time"
          type="time"
          {...register('time')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" loading={loading}>
          {expense ? 'Update' : 'Add Expense'}
        </Button>
      </div>
    </form>
  );
}
