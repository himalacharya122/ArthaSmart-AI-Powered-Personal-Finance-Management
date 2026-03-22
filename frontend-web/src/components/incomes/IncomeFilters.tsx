import { Search } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import type { IncomeFilters as IncomeFiltersType } from '@/types/income';

interface IncomeFiltersProps {
  filters: IncomeFiltersType;
  onChange: (filters: IncomeFiltersType) => void;
}

export function IncomeFilters({ filters, onChange }: IncomeFiltersProps) {
  const { data: catData } = useCategories('income');
  const categories = catData?.results || [];

  function update(patch: Partial<IncomeFiltersType>) {
    onChange({ ...filters, ...patch, page: 1 });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-400" />
        <input
          type="text"
          placeholder="Search incomes..."
          value={filters.search || ''}
          onChange={(e) => update({ search: e.target.value || undefined })}
          className="w-full rounded-md border border-primary-200 bg-white py-2 pl-9 pr-3 text-sm text-primary-800 placeholder-primary-300 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <select
        value={filters.category || ''}
        onChange={(e) => update({ category: e.target.value ? Number(e.target.value) : undefined })}
        className="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">All Categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>

      <input
        type="date"
        value={filters.date_after || ''}
        onChange={(e) => update({ date_after: e.target.value || undefined })}
        className="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
      <span className="text-primary-400 text-sm">to</span>
      <input
        type="date"
        value={filters.date_before || ''}
        onChange={(e) => update({ date_before: e.target.value || undefined })}
        className="rounded-md border border-primary-200 bg-white px-3 py-2 text-sm text-primary-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      />
    </div>
  );
}
