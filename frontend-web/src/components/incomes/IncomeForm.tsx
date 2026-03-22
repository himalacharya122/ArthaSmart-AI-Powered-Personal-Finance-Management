import { useForm } from 'react-hook-form';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { IncomeCreate, Income } from '@/types/income';

interface IncomeFormProps {
  income?: Income | null;
  loading?: boolean;
  onSubmit: (data: IncomeCreate) => void;
  onCancel: () => void;
}

export function IncomeForm({ income, loading, onSubmit, onCancel }: IncomeFormProps) {
  const { data: catData } = useCategories('income');
  const categories = catData?.results || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<IncomeCreate>({
    defaultValues: income
      ? {
          amount: income.amount,
          source_name: income.source_name,
          description: income.description,
          date: income.date,
          category_id: income.category?.id ?? undefined,
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
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
            Category
          </label>
          <select
            className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
        label="Source Name"
        placeholder="e.g. Salary, Freelance, Investment"
        error={errors.source_name?.message}
        {...register('source_name', { required: 'Source name is required' })}
      />

      <Input
        label="Description"
        placeholder="e.g. March 2026 salary"
        {...register('description')}
      />

      <Input
        label="Date"
        type="date"
        error={errors.date?.message}
        {...register('date', { required: 'Date is required' })}
      />

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="accent" loading={loading}>
          {income ? 'Update' : 'Add Income'}
        </Button>
      </div>
    </form>
  );
}
