/**
 * IoT Receipt Scanner — Receipts review page
 * ============================================
 * This page is the web UI side of the ESP32-CAM receipt scanning workflow.
 *
 * Flow recap:
 *   1. User clicks "Capture now" on the IoT Devices page (IoTDevicesPage.tsx).
 *   2. ESP32-CAM captures a JPEG and posts it to /api/v1/iot/ingest/receipt/.
 *   3. Backend saves the image as Receipt(status="pending").
 *   4. OCR pipeline runs asynchronously → status changes to "completed",
 *      ocr_parsed_data is filled with { merchant, total, date, currency, items[] }.
 *   5. User comes to THIS page, sees the receipt card, clicks "Confirm".
 *   6. Confirm modal is pre-filled from OCR; user edits if OCR got anything wrong.
 *   7. POST /receipts/{id}/confirm/ → creates an Expense on the backend.
 *
 * Backend files involved:
 *   backend/apps/receipts/views.py       — ReceiptViewSet (list / confirm / destroy)
 *   backend/apps/receipts/serializers.py — ReceiptListSerializer / ReceiptConfirmSerializer
 *   backend/apps/receipts/models.py      — Receipt model (status, ocr_parsed_data, …)
 *   backend/apps/iot/ingest.py           — IngestReceiptView (what the ESP32 hits)
 *
 * To remove this page:
 *   1. Delete this file.
 *   2. Remove the /receipts route from src/App.tsx.
 *   3. Remove the "Receipts" nav item from src/components/layout/Sidebar.tsx.
 *   4. See full removal checklist in src/api/receipts.ts.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Camera,
  CheckCircle,
  Clock,
  AlertTriangle,
  Loader2,
  Trash2,
  Receipt,
  ArrowRight,
} from 'lucide-react';

import { useReceipts, useReceipt, useConfirmReceipt, useDeleteReceipt } from '@/hooks/useReceipts';
import { useCategories } from '@/hooks/useCategories';

import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';

import { formatRelativeDate } from '@/utils/format';
import { CURRENCIES } from '@/utils/constants';
import { cn } from '@/utils/cn';

import type { ReceiptListItem } from '@/api/receipts';
import type { ReceiptConfirmData } from '@/api/receipts';

// ---------------------------------------------------------------------------
// Status badge
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: ReceiptListItem['status'] }) {
  if (status === 'completed') {
    return (
      <Badge variant="success" className="gap-1">
        <CheckCircle className="h-3 w-3" /> Completed
      </Badge>
    );
  }
  if (status === 'processing') {
    return (
      <Badge variant="info" className="gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Processing
      </Badge>
    );
  }
  if (status === 'failed') {
    return (
      <Badge variant="danger" className="gap-1">
        <AlertTriangle className="h-3 w-3" /> Failed
      </Badge>
    );
  }
  // pending
  return (
    <Badge variant="neutral" className="gap-1">
      <Clock className="h-3 w-3" /> Pending OCR
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Confirm modal — pre-fills from OCR data, lets user correct before saving
// ---------------------------------------------------------------------------

function ConfirmModal({
  receiptId,
  open,
  onClose,
}: {
  receiptId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  // Fetch full detail (with ocr_parsed_data) only when the modal opens.
  const { data: receipt, isLoading } = useReceipt(open ? receiptId : null);
  const confirmMut = useConfirmReceipt();
  const { data: categoriesData } = useCategories('expense');
  const categories = categoriesData?.results || [];

  const ocr = receipt?.ocr_parsed_data ?? {};

  const { register, handleSubmit, reset, formState: { errors } } = useForm<ReceiptConfirmData>({
    values: {
      // Pre-fill from OCR; user can override any field
      amount: ocr.total != null ? String(ocr.total) : '',
      merchant: ocr.merchant ?? '',
      date: ocr.date ?? '',
      description: '',
      category_id: null,
    },
  });

  function submit(data: ReceiptConfirmData) {
    if (!receiptId) return;
    confirmMut.mutate(
      {
        id: receiptId,
        data: {
          ...data,
          category_id: data.category_id ? Number(data.category_id) : null,
        },
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      },
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Confirm receipt expense">
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-primary-950/40" />
        </div>
      ) : (
        <>
          {/* Show receipt thumbnail + raw OCR confidence */}
          {receipt?.image && (
            <div className="mb-4 flex gap-4">
              <img
                src={receipt.image}
                alt="Receipt"
                className="h-40 w-28 rounded-md border border-primary-950/10 object-cover"
              />
              <div className="text-xs text-primary-950/60 space-y-1 pt-1">
                {ocr.merchant && <p><span className="font-medium">Merchant:</span> {ocr.merchant}</p>}
                {ocr.total != null && <p><span className="font-medium">Total:</span> {String(ocr.total)} {ocr.currency ?? ''}</p>}
                {ocr.date && <p><span className="font-medium">Date:</span> {ocr.date}</p>}
                {receipt.ocr_confidence != null && (
                  <p><span className="font-medium">OCR confidence:</span> {(receipt.ocr_confidence * 100).toFixed(0)}%</p>
                )}
                {/* List OCR-extracted items if present */}
                {ocr.items && ocr.items.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium mb-1">Items:</p>
                    <ul className="space-y-0.5">
                      {ocr.items.slice(0, 5).map((item, i) => (
                        <li key={i}>{item.name}{item.qty ? ` ×${item.qty}` : ''}{item.price != null ? ` — ${item.price}` : ''}</li>
                      ))}
                      {ocr.items.length > 5 && (
                        <li className="text-primary-950/40">+{ocr.items.length - 5} more…</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <p className="mb-4 text-xs text-primary-950/50">
            Review the OCR-extracted values below and correct anything before saving.
          </p>

          <form onSubmit={handleSubmit(submit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Input
                  label="Amount"
                  type="number"
                  step="0.01"
                  placeholder="380.00"
                  error={errors.amount?.message}
                  {...register('amount', { required: 'Amount is required' })}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-primary-950/80">Currency</label>
                <select
                  className="mt-2 block w-full rounded-md border border-primary-950/20 bg-white py-3 px-3 text-primary-950 focus:border-primary-950/40 focus:outline-none focus:ring-0"
                >
                  {CURRENCIES.map((c) => (
                    <option key={c.code} value={c.code}
                      selected={c.code === (ocr.currency ?? 'NPR')}
                    >{c.code}</option>
                  ))}
                </select>
              </div>
            </div>

            <Input
              label="Merchant"
              placeholder="e.g. Horizon Mart Pvt. Ltd."
              {...register('merchant')}
            />

            <Input
              label="Date"
              type="date"
              {...register('date')}
            />

            <div>
              <label className="block text-sm font-bold text-primary-950/80">Category (optional)</label>
              <select
                className="mt-2 block w-full rounded-md border border-primary-950/20 bg-white py-3 px-3 text-primary-950 focus:border-primary-950/40 focus:outline-none focus:ring-0"
                defaultValue=""
                {...register('category_id')}
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-bold text-primary-950/80">Description (optional)</label>
              <textarea
                rows={2}
                className="mt-2 block w-full rounded-md border border-primary-950/20 bg-white py-3 px-3 text-primary-950 focus:border-primary-950/40 focus:outline-none focus:ring-0"
                placeholder="Add a note…"
                {...register('description')}
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
              <Button type="submit" variant="accent" loading={confirmMut.isPending}>
                Create expense
              </Button>
            </div>
          </form>
        </>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Receipt card
// ---------------------------------------------------------------------------

function ReceiptCard({
  receipt,
  onConfirm,
  onDelete,
}: {
  receipt: ReceiptListItem;
  onConfirm: (id: number) => void;
  onDelete: (id: number) => void;
}) {
  const alreadyConfirmed = receipt.expense !== null;

  return (
    <Card padding="md" className="flex flex-col gap-3">
      {/* Thumbnail */}
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-md bg-primary-50">
        {receipt.image ? (
          <img
            src={receipt.image}
            alt="Receipt"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Receipt className="h-10 w-10 text-primary-950/20" />
          </div>
        )}
        {/* Status badge overlaid on image */}
        <div className="absolute top-2 right-2">
          <StatusBadge status={receipt.status} />
        </div>
        {/* Already confirmed ribbon */}
        {alreadyConfirmed && (
          <div className="absolute bottom-0 left-0 right-0 bg-accent-600/90 py-1 text-center text-xs font-semibold text-white">
            Expense logged
          </div>
        )}
      </div>

      {/* Meta */}
      <div className="space-y-1 text-xs text-primary-950/60">
        <p>{formatRelativeDate(receipt.created_at)}</p>
        {receipt.ocr_confidence != null && receipt.status === 'completed' && (
          <p>OCR confidence: {(receipt.ocr_confidence * 100).toFixed(0)}%</p>
        )}
      </div>

      {/* Actions */}
      <div className={cn('mt-auto flex gap-2 pt-1', alreadyConfirmed && 'opacity-50')}>
        <Button
          variant="accent"
          className="flex-1 text-xs"
          // Allow confirm on any status so the user can manually enter details
          // even when OCR is still pending or failed. Only block while actively
          // processing (OCR in flight) or when already confirmed.
          disabled={receipt.status === 'processing' || alreadyConfirmed}
          onClick={() => onConfirm(receipt.id)}
        >
          {alreadyConfirmed ? 'Confirmed' : 'Confirm'}
        </Button>
        <button
          onClick={() => onDelete(receipt.id)}
          className="rounded-md p-2 text-primary-950/50 hover:bg-danger-50 hover:text-danger-600"
          title="Delete receipt"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function ReceiptsPage() {
  const { data, isLoading } = useReceipts();
  const deleteMut = useDeleteReceipt();

  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const receipts = data?.results ?? [];
  const pendingCount = receipts.filter((r) => r.status === 'pending' || r.status === 'processing').length;

  return (
    <div>
      <PageHeader
        title="Receipts"
        description="Receipt images captured by your ESP32-CAM scanner. Review OCR results and confirm to log an expense."
      />

      {/* Callout: how to capture */}
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-primary-950/10 bg-primary-50 p-4">
        <Camera className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary-950/60" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-primary-950">
            To scan a receipt, go to IoT Devices and click "Capture now" on your scanner.
          </p>
          <p className="mt-1 text-xs text-primary-950/60">
            The ESP32-CAM will fire within 2 seconds. New receipts appear here automatically
            every 30 s while OCR runs in the background.
          </p>
        </div>
        <Link
          to="/iot-devices"
          className="inline-flex items-center gap-1 rounded-md bg-primary-950 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800 whitespace-nowrap"
        >
          IoT Devices <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Pending OCR notice */}
      {pendingCount > 0 && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-warning-400 bg-warning-50 px-4 py-2 text-sm text-warning-700">
          <Loader2 className="h-4 w-4 animate-spin" />
          {pendingCount} receipt{pendingCount > 1 ? 's' : ''} waiting for OCR — this page refreshes automatically.
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={<Camera className="h-12 w-12" />}
          title="No receipts yet"
          description="Pair your ESP32-CAM scanner from the IoT Devices page, then click Capture now to scan your first receipt."
          actionLabel="Go to IoT Devices"
          onAction={() => window.location.assign('/iot-devices')}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {receipts.map((r) => (
            <ReceiptCard
              key={r.id}
              receipt={r}
              onConfirm={setConfirmId}
              onDelete={setDeletingId}
            />
          ))}
        </div>
      )}

      {/* Confirm modal */}
      <ConfirmModal
        receiptId={confirmId}
        open={confirmId !== null}
        onClose={() => setConfirmId(null)}
      />

      {/* Delete confirm */}
      <Modal
        open={deletingId !== null}
        onClose={() => setDeletingId(null)}
        title="Delete receipt"
        size="sm"
      >
        <p className="text-sm text-primary-950/70">
          Delete this receipt image? Any already-created expense stays intact.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeletingId(null)}>Cancel</Button>
          <Button
            variant="danger"
            loading={deleteMut.isPending}
            onClick={() =>
              deletingId !== null &&
              deleteMut.mutate(deletingId, { onSuccess: () => setDeletingId(null) })
            }
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
