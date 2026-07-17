import { useState } from 'react';
import { Plus, Lock, Pencil, Trash2, Tags } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { EmptyState } from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { cn } from '@/utils/cn';
import { useForm } from 'react-hook-form';
import type { Category, CategoryCreate } from '@/types/category';

const PRESET_COLORS = [
  '#E74C3C', '#E67E22', '#F39C12', '#2ECC71', '#1ABC9C',
  '#3498DB', '#9B59B6', '#34495E', '#95A5A6', '#D35400',
  '#16A085', '#2980B9', '#8E44AD', '#F1C40F', '#60CE80',
];

function CategoryForm({ category, onSubmit, onCancel, loading }: {
  category?: Category | null;
  onSubmit: (data: CategoryCreate) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CategoryCreate>({
    defaultValues: category
      ? { name: category.name, type: category.type, icon: category.icon, color: category.color }
      : { type: 'expense', color: '#3498DB' },
  });
  // eslint-disable-next-line react-hooks/incompatible-library
  const selectedColor = watch('color');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input
        label="Name"
        placeholder="e.g. Groceries"
        error={errors.name?.message}
        {...register('name', { required: 'Name is required' })}
      />

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">Type</label>
        <select
          className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          {...register('type', { required: 'Type is required' })}
        >
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
      </div>

      <Input
        label="Icon (optional)"
        placeholder="e.g. utensils, briefcase"
        {...register('icon')}
      />

      <div>
        <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600 mb-2">Color</label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setValue('color', color)}
              className={cn(
                'h-8 w-8 rounded-full border-2 transition-transform',
                selectedColor === color ? 'border-primary-700 scale-110' : 'border-transparent',
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="accent" loading={loading}>
          {category ? 'Update' : 'Create Category'}
        </Button>
      </div>
    </form>
  );
}

export function CategoriesPage() {
  const [tab, setTab] = useState<'expense' | 'income'>('expense');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const { data, isLoading } = useCategories(tab);
  const createMut = useCreateCategory();
  const updateMut = useUpdateCategory();
  const deleteMut = useDeleteCategory();

  const categories = data?.results || [];

  function handleCreate(formData: CategoryCreate) {
    createMut.mutate({ ...formData, type: tab }, { onSuccess: () => setFormOpen(false) });
  }

  function handleUpdate(formData: CategoryCreate) {
    if (!editing) return;
    updateMut.mutate(
      { id: editing.id, data: formData },
      { onSuccess: () => { setEditing(null); setFormOpen(false); } },
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteMut.mutate(deleting.id, { onSuccess: () => setDeleting(null) });
  }

  return (
    <div>
      <PageHeader
        title="Categories"
        description="Manage your expense and income categories"
        action={
          <Button variant="accent" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-primary-100 p-1 w-fit">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors capitalize',
              tab === t ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-500 hover:text-primary-700',
            )}
          >
            {t} Categories
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<Tags className="h-12 w-12" />}
          title="No categories"
          description={`No ${tab} categories found. Add one to get started.`}
          actionLabel="Add category"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categories.map((cat) => (
            <Card key={cat.id} padding="sm">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: (cat.color || '#94a3b8') + '20' }}
                >
                  <span
                    className="inline-block h-4 w-4 rounded-full"
                    style={{ backgroundColor: cat.color || '#94a3b8' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-primary-800 truncate">{cat.name}</p>
                  <p className="text-xs text-primary-400 capitalize">{cat.type}</p>
                </div>
                {cat.is_default ? (
                  <Lock className="h-4 w-4 flex-shrink-0 text-primary-300" aria-label="System default" />
                ) : (
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditing(cat); setFormOpen(true); }}
                      className="rounded p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-600"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleting(cat)}
                      className="rounded p-1 text-primary-400 hover:bg-danger-50 hover:text-danger-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} title={editing ? 'Edit Category' : 'Add Category'}>
        <CategoryForm
          category={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Remove Category" size="sm">
        <p className="text-sm text-primary-500">
          Are you sure you want to remove &quot;{deleting?.name}&quot;?
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMut.isPending} onClick={handleDelete}>Remove</Button>
        </div>
      </Modal>
    </div>
  );
}
