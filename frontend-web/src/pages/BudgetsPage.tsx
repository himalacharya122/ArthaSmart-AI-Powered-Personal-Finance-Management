import { useState } from 'react';
import { Plus, Wallet } from 'lucide-react';
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget } from '@/hooks/useBudgets';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { BudgetCard } from '@/components/budgets/BudgetCard';
import { BudgetForm } from '@/components/budgets/BudgetForm';
import type { Budget, BudgetCreate } from '@/types/budget';

export function BudgetsPage() {
  const user = useAuthStore((s) => s.user);
  const currency = user?.preferred_currency || 'NPR';

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Budget | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const { data, isLoading } = useBudgets({ page_size: 50 });
  const createMut = useCreateBudget();
  const updateMut = useUpdateBudget();
  const deleteMut = useDeleteBudget();

  function handleCreate(formData: BudgetCreate) {
    createMut.mutate(formData, { onSuccess: () => setFormOpen(false) });
  }

  function handleUpdate(formData: BudgetCreate) {
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

  const budgets = data?.results || [];

  return (
    <div>
      <PageHeader
        title="Budgets"
        description="Set spending limits and track progress"
        action={
          <Button variant="accent" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Create Budget
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-12 w-12" />}
          title="No budgets yet"
          description="Create your first budget to start tracking spending limits."
          actionLabel="Create first budget"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {budgets.map((budget) => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              currency={currency}
              onEdit={() => { setEditing(budget); setFormOpen(true); }}
              onDelete={() => setDeleting(budget)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit modal */}
      <Modal open={formOpen} onClose={() => { setFormOpen(false); setEditing(null); }} title={editing ? 'Edit Budget' : 'Create Budget'}>
        <BudgetForm
          budget={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Budget" size="sm">
        <p className="text-sm text-primary-500">
          Are you sure you want to delete &quot;{deleting?.name}&quot;? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMut.isPending} onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
