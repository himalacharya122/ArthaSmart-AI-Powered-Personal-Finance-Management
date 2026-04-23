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
