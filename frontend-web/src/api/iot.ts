import apiClient from './client';
import type { PaginatedResponse } from '@/types/api';
import type {
  Device,
  DeviceUpdate,
  RotateKeyResponse,
  NFCTag,
  NFCTagCreate,
  PairingClaim,
  PairingClaimResponse,
} from '@/types/iot';

// ---------------------------------------------------------------------------
// Devices — /api/v1/iot/devices/
// ---------------------------------------------------------------------------
//
// We never POST here to create a device. Devices come into existence via the
// pairing flow (see `claimPairingCode` below). This endpoint only serves
// list / detail / update / delete / rotate-key.

export async function fetchDevices(): Promise<PaginatedResponse<Device>> {
  const res = await apiClient.get<PaginatedResponse<Device>>('/iot/devices/');
  return res.data;
}

export async function updateDevice(id: number, data: DeviceUpdate): Promise<Device> {
  const res = await apiClient.patch<Device>(`/iot/devices/${id}/`, data);
  return res.data;
}

export async function deleteDevice(id: number): Promise<void> {
  await apiClient.delete(`/iot/devices/${id}/`);
}

export async function rotateDeviceKey(id: number): Promise<RotateKeyResponse> {
  const res = await apiClient.post<RotateKeyResponse>(`/iot/devices/${id}/rotate-key/`);
  return res.data;
}

// ---------------------------------------------------------------------------
// NFC tags — /api/v1/iot/nfc-tags/
// ---------------------------------------------------------------------------

export async function fetchNfcTags(): Promise<PaginatedResponse<NFCTag>> {
  const res = await apiClient.get<PaginatedResponse<NFCTag>>('/iot/nfc-tags/');
  return res.data;
}

export async function createNfcTag(data: NFCTagCreate): Promise<NFCTag> {
  const res = await apiClient.post<NFCTag>('/iot/nfc-tags/', data);
  return res.data;
}

export async function updateNfcTag(id: number, data: Partial<NFCTagCreate>): Promise<NFCTag> {
  const res = await apiClient.patch<NFCTag>(`/iot/nfc-tags/${id}/`, data);
  return res.data;
}

export async function deleteNfcTag(id: number): Promise<void> {
  await apiClient.delete(`/iot/nfc-tags/${id}/`);
}

// ---------------------------------------------------------------------------
// Pairing — /api/v1/iot/pair/claim/
// ---------------------------------------------------------------------------
//
// The device has already hit /pair/request/ on its own (no JWT). The web UI
// only needs `claim`: the user types the 6-digit code, we attach it to their
// account, and the backend spins up a real Device row + fresh api_key.

export async function claimPairingCode(data: PairingClaim): Promise<PairingClaimResponse> {
  const res = await apiClient.post<PairingClaimResponse>('/iot/pair/claim/', data);
  return res.data;
}

// ---------------------------------------------------------------------------
// IoT Receipt Scanner — remote capture trigger
// ---------------------------------------------------------------------------
//
// Clicking "Capture now" in the web UI hits this endpoint, which sets
// `pending_capture = True` on the IoTDevice row. The ESP32-CAM firmware
// polls GET /api/v1/iot/poll/ every 2 s, sees the flag, fires the shutter,
// uploads the JPEG, and clears the flag.
//
// Backend endpoint to add (if not already done):
//   POST /api/v1/iot/devices/{id}/capture/   (apps/iot/views.py IoTDeviceViewSet)
//   — sets device.pending_capture = True, returns 200 {}
//
// To remove: delete this function and remove useTriggerCapture from useIot.ts,
// then remove the "Capture now" button from IoTDevicesPage.tsx.

export async function triggerCapture(deviceId: number): Promise<void> {
  await apiClient.post(`/iot/devices/${deviceId}/capture/`);
}
