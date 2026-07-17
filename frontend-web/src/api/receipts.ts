/**
 * IoT Receipt Scanner — API layer
 * =================================
 * HTTP functions for the receipt endpoints that back the web UI's receipt
 * review flow. Receipts enter the system in one of two ways:
 *   1. ESP32-CAM uploads a JPEG via POST /api/v1/iot/ingest/receipt/
 *      (handled by backend/apps/iot/ingest.py :: IngestReceiptView)
 *   2. Manual upload from the web UI (not in scope here — see /receipts/upload/)
 *
 * After upload, the backend OCR pipeline processes the image asynchronously
 * and fills in ocr_parsed_data: { merchant, total, date, currency, items[] }.
 * The user then reviews and confirms to create an Expense record.
 *
 * Backend files involved:
 *   backend/apps/receipts/models.py      — Receipt model
 *   backend/apps/receipts/views.py       — ReceiptViewSet (list/retrieve/confirm/destroy)
 *   backend/apps/receipts/serializers.py — ReceiptListSerializer / ReceiptDetailSerializer
 *
 * Endpoints used:
 *   GET    /api/v1/receipts/              → list (ReceiptListSerializer)
 *   GET    /api/v1/receipts/{id}/         → detail with OCR data (ReceiptDetailSerializer)
 *   POST   /api/v1/receipts/{id}/confirm/ → create Expense from OCR results
 *   DELETE /api/v1/receipts/{id}/         → remove receipt
 *
 * To remove this feature entirely:
 *   1. Delete this file.
 *   2. Delete src/hooks/useReceipts.ts
 *   3. Delete src/pages/ReceiptsPage.tsx
 *   4. Remove the /receipts route from src/App.tsx
 *   5. Remove the "Receipts" nav item from src/components/layout/Sidebar.tsx
 *   6. Remove the triggerCapture additions from src/api/iot.ts and src/hooks/useIot.ts
 *   7. Remove the "Capture now" button from src/pages/IoTDevicesPage.tsx
 */

import apiClient from './client';
import type { PaginatedResponse } from '@/types/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Structured data the OCR pipeline extracts from the receipt image. */
export interface OcrParsedData {
  merchant?: string;
  total?: number | string;
  date?: string;
  currency?: string;
  items?: Array<{
    name: string;
    qty?: number;
    price?: number;
  }>;
}

/**
 * Lightweight receipt as returned by the list endpoint.
 * Backend: ReceiptListSerializer
 */
export interface ReceiptListItem {
  id: number;
  image: string;           // absolute URL (Django MEDIA_URL + path)
  status: 'pending' | 'processing' | 'completed' | 'failed';
  ocr_confidence: number | null;
  expense: number | null;  // FK id — non-null means an Expense was already created
  created_at: string;
}

/**
 * Full receipt with OCR results, returned by the detail endpoint.
 * Backend: ReceiptDetailSerializer
 */
export interface Receipt extends ReceiptListItem {
  ocr_raw_text: string;
  ocr_parsed_data: OcrParsedData | null;
  processing_time_ms: number | null;
  source_device: number | null;  // FK to IoTDevice — set when captured by ESP32-CAM
  error_message: string;
}

/**
 * Payload for POST /api/v1/receipts/{id}/confirm/.
 * All fields are optional — whatever the user doesn't fill in falls back
 * to the OCR-extracted value on the backend.
 * Backend: ReceiptConfirmSerializer → Expense.objects.create(...)
 */
export interface ReceiptConfirmData {
  amount?: string;           // decimal string, e.g. "380.00"
  merchant?: string;
  category_id?: number | null;
  date?: string;             // ISO date string, e.g. "2026-03-26"
  description?: string;
}

// ---------------------------------------------------------------------------
// API functions
// ---------------------------------------------------------------------------

/**
 * List all receipts for the authenticated user.
 * Optionally filter by status (e.g. "pending", "completed").
 */
export async function fetchReceipts(
  params?: { status?: string; ordering?: string },
): Promise<PaginatedResponse<ReceiptListItem>> {
  const res = await apiClient.get<PaginatedResponse<ReceiptListItem>>('/receipts/', { params });
  return res.data;
}

/**
 * Fetch a single receipt with full OCR data.
 * Used to populate the confirm/review modal.
 */
export async function fetchReceipt(id: number): Promise<Receipt> {
  const res = await apiClient.get<Receipt>(`/receipts/${id}/`);
  return res.data;
}

/**
 * Confirm OCR data and create an Expense from the receipt.
 * The backend fills any missing fields from ocr_parsed_data.
 * Returns the newly created Expense (ExpenseDetailSerializer).
 */
export async function confirmReceipt(
  id: number,
  data: ReceiptConfirmData,
): Promise<{ id: number; amount: string; merchant: string }> {
  const res = await apiClient.post(`/receipts/${id}/confirm/`, data);
  return res.data;
}

/** Delete a receipt (and its stored image). Does NOT delete the linked Expense. */
export async function deleteReceipt(id: number): Promise<void> {
  await apiClient.delete(`/receipts/${id}/`);
}
