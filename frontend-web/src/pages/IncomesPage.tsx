import { useState } from 'react';
import { Plus, Trash2, Pencil, FileText } from 'lucide-react';
import { useIncomes, useCreateIncome, useUpdateIncome, useDeleteIncome } from '@/hooks/useIncomes';
import { useAuthStore } from '@/store/authStore';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { EmptyState } from '@/components/common/EmptyState';
import { Pagination } from '@/components/common/Pagination';
import { TableRowSkeleton } from '@/components/common/LoadingSkeleton';
import { IncomeFilters } from '@/components/incomes/IncomeFilters';
import { IncomeForm } from '@/components/incomes/IncomeForm';
import { formatCurrency, formatDate } from '@/utils/format';
import { DEFAULT_PAGE_SIZE } from '@/utils/constants';
import type { IncomeFilters as IncomeFiltersType, Income, IncomeCreate } from '@/types/income';

export function IncomesPage() {
  const user = useAuthStore((s) => s.user);
  const currency = user?.preferred_currency || 'NPR';

  const [filters, setFilters] = useState<IncomeFiltersType>({
    page: 1,
    page_size: DEFAULT_PAGE_SIZE,
    ordering: '-date',
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Income | null>(null);
  const [deleting, setDeleting] = useState<Income | null>(null);

  const { data, isLoading } = useIncomes(filters);
  const createMut = useCreateIncome();
  const updateMut = useUpdateIncome();
  const deleteMut = useDeleteIncome();

  function handleCreate(formData: IncomeCreate) {
    createMut.mutate(formData, {
      onSuccess: () => setFormOpen(false),
    });
  }

  function handleUpdate(formData: IncomeCreate) {
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

  function openEdit(income: Income) {
    setEditing(income);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
    setEditing(null);
  }

  const incomes = data?.results || [];
  const totalCount = data?.count || 0;

  return (
    <div>
      <PageHeader
        title="Incomes"
        description="Track your earnings and revenue"
        action={
          <Button variant="accent" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Income
          </Button>
        }
      />

      {/* Filters */}
      <Card className="mb-4" padding="sm">
        <IncomeFilters filters={filters} onChange={setFilters} />
      </Card>

      {/* Table */}
      <Card padding="none">
        {isLoading ? (
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRowSkeleton key={i} cols={5} />
              ))}
            </tbody>
          </table>
        ) : incomes.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No incomes yet"
            description="Once you log your first income it'll show up here. Add one to get started."
            actionLabel="Add first income"
            onAction={() => setFormOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-primary-100 text-left text-xs font-semibold uppercase text-primary-400">
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3 hidden md:table-cell">Category</th>
                  <th className="px-4 py-3 hidden lg:table-cell">Description</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {incomes.map((inc) => (
                  <tr
                    key={inc.id}
                    className="border-b border-primary-50 last:border-0 hover:bg-primary-50/50"
                  >
                    <td className="px-4 py-3 text-primary-500">
                      {formatDate(inc.date, 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-accent-600">
                      +{formatCurrency(inc.amount, inc.currency || currency)}
                    </td>
                    <td className="px-4 py-3 font-medium text-primary-700">
                      {inc.source_name}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {inc.category ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: inc.category.color || '#94a3b8' }}
                          />
                          <span className="text-primary-500">{inc.category.name}</span>
                        </span>
                      ) : (
                        <span className="text-primary-300">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-primary-500 hidden lg:table-cell max-w-[200px] truncate">
                      {inc.description || '--'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(inc)}
                          className="rounded p-1.5 text-primary-400 hover:bg-primary-100 hover:text-primary-600"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleting(inc)}
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
        title={editing ? 'Edit Income' : 'Add Income'}
      >
        <IncomeForm
          income={editing}
          loading={createMut.isPending || updateMut.isPending}
          onSubmit={editing ? handleUpdate : handleCreate}
          onCancel={closeForm}
        />
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Delete Income" size="sm">
        <p className="text-sm text-primary-500">
          Are you sure you want to delete this income
          {deleting?.source_name ? ` from "${deleting.source_name}"` : ''}? This action cannot be undone.
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
