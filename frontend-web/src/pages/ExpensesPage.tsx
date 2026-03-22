import { useState } from 'react';
import { Plus, Trash2, Pencil, FileText } from 'lucide-react';
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense } from '@/hooks/useExpenses';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { TableRowSkeleton } from '@/components/common/LoadingSkeleton';
import { ExpenseFilters } from '@/components/expenses/ExpenseFilters';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';
import { formatCurrency, formatDate } from '@/utils/format';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import type { ExpenseFilters as ExpenseFiltersType, Expense, ExpenseCreate } from '@/types/expense';

export function ExpensesPage() {
  const user = useAuthStore((s) => s.user);
  const currency = user?.preferred_currency || 'NPR';

  const [filters, setFilters] = useState<ExpenseFiltersType>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    ordering: '-date',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const { data, isLoading } = useExpenses(filters);
  const createMut = useCreateExpense();
  const updateMut = useUpdateExpense();
  const deleteMut = useDeleteExpense();

  function handleCreate(formData: ExpenseCreate) {
    createMut.mutate(formData, {
      onSuccess: () => setFormOpen(false),
    });
  }

  function handleUpdate(formData: ExpenseCreate) {
    if (!editing) return;
    updateMut.mutate(
      { id: editing.id, data: formData },
      { onSuccess: () => { setEditing(null); setFormOpen(false); } },
    );
  }

  function handleDelete() {
    if (!deleting) return;
    deleteMut.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
    });
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  const expenses = data?.results || [];
  const totalCount = data?.count || 0;

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track and manage your spending"
        action={
          <Button variant="accent" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Expense
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4" padding="sm">
        <ExpenseFilters filters={filters} onChange={setFilters} />
      </Card>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={6} />
              ))}
            </tbody>
          </table>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No expenses yet"
            description="Once you log your first expense it'll show up here. Add one to get started."
            actionLabel="Add first expense"
            onAction={() => setFormOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100 text-left text-xs font-semibold uppercase text-primary-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 hidden md:table-cell">Merchant</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((exp) => (
                  <tr
                    key={exp.id}
                    className="border-b border-primary-50 last:border-0 hover:bg-primary-50/50"
                  >
                    <td className="px-4 py-3 text-primary-500">
                      {formatDate(exp.date, 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-danger-500">
                      -{formatCurrency(exp.amount, exp.currency || currency)}
                    </td>
                    <td className="px-4 py-3">
                      {exp.category ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: exp.category.color || '#94a3b8' }}
                          />
                          <span className="text-primary-600">{exp.category.name}</span>
                        </span>
                      ) : (
                        <span className="text-primary-300">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-primary-500 hidden md:table-cell">
                      {exp.merchant || '--'}
                    </td>
                    <td className="px-4 py-3 text-primary-500 hidden lg:table-cell max-w-[200px] truncate">
                      {exp.description || '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(exp)}
                          className="rounded p-1.5 text-primary-400 hover:bg-primary-100 hover:text-primary-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(exp)}
                          className="rounded p-1.5 text-primary-400 hover:bg-danger-50 hover:text-danger-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalCount > 0 && (
          <div className="px-4 pb-3">
            <Pagination
              page={filters.page || 1}
              totalCount={totalCount}
              pageSize={filters.page_size || DEFAULT_PAGE_SIZE}
              onPageChange={(p) => setFilters({ ...filters, page: p })}
            />
          </div>
        )}
      </Card>

      {/* Add/Edit modal */}
      <Modal
        open={formOpen}
        onClose={closeForm}
        title={editing ? 'Edit Expense' : 'Add Expense'}
      >
        <ExpenseForm
          expense={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={closeForm}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Expense" size="sm">
        <p className="text-sm text-primary-500">
          Are you sure you want to delete this expense
          {deleting?.description ? ` "${deleting.description}"` : ''}? This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button variant="danger" loading={deleteMut.isPending} onClick={handleDelete}>
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
