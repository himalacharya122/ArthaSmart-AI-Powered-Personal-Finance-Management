/**
 * IoT Receipt Scanner — React Query hooks
 * =========================================
 * TanStack Query wrappers around the receipts API functions.
 * These hooks are consumed exclusively by src/pages/ReceiptsPage.tsx.
 *
 * Query keys:
 *   ['receipts']          — list (invalidated after confirm / delete)
 *   ['receipts', id]      — detail (fetched on-demand for the confirm modal)
 *
 * To remove this feature: delete this file and delete ReceiptsPage.tsx.
 * Also see the removal checklist in src/api/receipts.ts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import {
  fetchReceipts,
  fetchReceipt,
  confirmReceipt,
  deleteReceipt,
} from '@/api/receipts';
import type { ReceiptConfirmData } from '@/api/receipts';

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** List all receipts for the current user (re-fetched every 30 s so OCR status updates). */
export function useReceipts(params?: { status?: string }) {
  return useQuery({
    queryKey: ['receipts', params],
    queryFn: () => fetchReceipts(params),
    // Poll every 30 s so status changes from the OCR pipeline appear
    // without the user manually refreshing.
    refetchInterval: 30_000,
  });
}

/** Fetch a single receipt with full OCR data — used to pre-fill the confirm modal. */
export function useReceipt(id: number | null) {
  return useQuery({
    queryKey: ['receipts', id],
    queryFn: () => fetchReceipt(id!),
    enabled: id !== null,
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/**
 * Confirm OCR results and create an Expense.
 * On success: invalidates the receipts list (the card status will update)
 * and shows a toast pointing the user to the Expenses page.
 */
export function useConfirmReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ReceiptConfirmData }) =>
      confirmReceipt(id, data),
    onSuccess: (_result, { id }) => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      qc.invalidateQueries({ queryKey: ['receipts', id] });
      // Also invalidate expenses so the new expense appears immediately.
      qc.invalidateQueries({ queryKey: ['expenses'] });
      toast.success('Expense created from receipt');
    },
    onError: () => toast.error('Failed to confirm receipt'),
  });
}

/** Delete a receipt. Invalidates the list on success. */
export function useDeleteReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteReceipt(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] });
      toast.success('Receipt deleted');
    },
    onError: () => toast.error('Failed to delete receipt'),
  });
}
