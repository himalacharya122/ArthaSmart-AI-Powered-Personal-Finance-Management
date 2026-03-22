import { useForm } from 'react-hook-form';
import { useCategories } from '@/hooks/useCategories';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import type { BudgetCreate, Budget } from '@/types/budget';

interface BudgetFormProps {
  budget?: Budget | null;
  loading?: boolean;
  onSubmit: (data: BudgetCreate) => void;
  onCancel: () => void;
}

export function BudgetForm({ budget, loading, onSubmit, onCancel }: BudgetFormProps) {
  const { data: catData } = useCategories('expense');
  const categories = catData?.results || [];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BudgetCreate>({
    defaultValues: budget
      ? {
          name: budget.name,
          amount: budget.amount,
          category_id: budget.category?.id ?? undefined,
          period: budget.period,
          start_date: budget.start_date,
          end_date: budget.end_date,
          alert_threshold: budget.alert_threshold,
          rollover: budget.rollover,
        }
      : {
          period: 'monthly',
          alert_threshold: 80,
          rollover: false,
          start_date: new Date().toISOString().split('T')[0],
        },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Budget Name"
        placeholder="e.g. Food Budget"
        error={errors.name?.message}
        {...register('name', { required: 'Name is required' })}
      />

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
            Period
          </label>
          <select
            className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            {...register('period', { required: 'Period is required' })}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
          Category (optional)
        </label>
        <select
          className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          {...register('category_id', { setValueAs: (v) => (v ? Number(v) : null) })}
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          error={errors.start_date?.message}
          {...register('start_date', { required: 'Start date is required' })}
        />
        <Input
          label="End Date"
          type="date"
          error={errors.end_date?.message}
          {...register('end_date', { required: 'End date is required' })}
        />
      </div>

      <Input
        label="Alert Threshold (%)"
        type="number"
        min={0}
        max={100}
        {...register('alert_threshold', { valueAsNumber: true })}
      />

      <label className="flex items-center gap-2 text-sm text-primary-700">
        <input type="checkbox" className="rounded" {...register('rollover')} />
        Rollover unused amount to next period
      </label>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="accent" loading={loading}>
          {budget ? 'Update' : 'Create Budget'}
        </Button>
      </div>
    </form>
  );
}
