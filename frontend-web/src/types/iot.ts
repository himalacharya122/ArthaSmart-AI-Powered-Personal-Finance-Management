/* eslint-disable @typescript-eslint/no-empty-object-type */
import type { CategoryMinimal } from './category';

/**
 * A registered IoT device. The user only ever sees their own.
 *
 * Backend: apps.iot.models.IoTDevice + IoTDeviceSerializer.
 *
 * Note on `device_id`: this is the *hardware* identifier (ESP32 MAC /
 * user-chosen HARDWARE_ID in config.h), not the row id. The surrogate PK
 * is `id: number`.
 */
export interface Device {
  id: number;
  name: string;
  device_type: 'receipt_scanner' | 'nfc_logger';
  device_id: string;
  api_key: string;                      // read-only; backend scrubs on create
  api_key_expires_at: string | null;
  is_active: boolean;
  last_seen: string | null;
  /** IoT Receipt Scanner — last known LAN IP, set by poll endpoint from X-Device-IP header.
   *  Used by the preview modal to build `http://{last_ip}/snapshot`.
   *  Empty string until the device has polled at least once. To remove: delete this line. */
  last_ip: string;
  firmware_version: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface DeviceUpdate {
  name?: string;
  is_active?: boolean;
  firmware_version?: string;
}

export interface RotateKeyResponse {
  api_key: string;
  api_key_expires_at: string | null;
}

/**
 * A pre-configured NFC tag. Tapping the tag mints an Expense from these
 * defaults. `tap_count` increments on every successful tap via
 * /iot/ingest/nfc-tap/.
 */
export interface NFCTag {
  id: number;
  tag_uid: string;
  label: string;
  category: CategoryMinimal | null;
  default_amount: string;               // DRF serialises Decimal as string
  default_currency: string;
  merchant: string;
  description: string;
  tap_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NFCTagCreate {
  tag_uid: string;
  label: string;
  category_id?: number | null;
  default_amount: string;
  default_currency?: string;
  merchant?: string;
  description?: string;
  is_active?: boolean;
}

/** Payload the user types into the web app to claim a pending pairing. */
export interface PairingClaim {
  pairing_code: string;                 // 6 digits
  name: string;
}

/**
 * Response from POST /iot/pair/claim/. The `api_key` field is the part
 * that matters — we show it exactly once and warn the user it won't
 * reappear. (The backend will show it again to the device once via
 * /iot/pair/status/{code}/, then the row flips to "consumed".)
 */
export interface PairingClaimResponse extends Device {}
