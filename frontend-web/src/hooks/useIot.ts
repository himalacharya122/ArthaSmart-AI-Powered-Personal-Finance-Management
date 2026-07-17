import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import {
  fetchDevices,
  updateDevice,
  deleteDevice,
  rotateDeviceKey,
  fetchNfcTags,
  createNfcTag,
  updateNfcTag,
  deleteNfcTag,
  claimPairingCode,
  triggerCapture,  // IoT Receipt Scanner: remote shutter trigger
} from '@/api/iot';
import type { DeviceUpdate, NFCTagCreate, PairingClaim } from '@/types/iot';

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

export function useDevices() {
  return useQuery({
    queryKey: ['iot-devices'],
    queryFn: fetchDevices,
  });
}

export function useUpdateDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DeviceUpdate }) => updateDevice(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iot-devices'] });
      toast.success('Device updated');
    },
    onError: () => toast.error('Failed to update device'),
  });
}

export function useDeleteDevice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteDevice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iot-devices'] });
      toast.success('Device removed');
    },
    onError: () => toast.error('Failed to remove device'),
  });
}

export function useRotateDeviceKey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => rotateDeviceKey(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iot-devices'] });
      // Don't toast here — the caller shows the new key in a modal and that
      // IS the success signal; a toast on top would be noise.
    },
    onError: () => toast.error('Failed to rotate key'),
  });
}

// ---------------------------------------------------------------------------
// NFC tags
// ---------------------------------------------------------------------------

export function useNfcTags() {
  return useQuery({
    queryKey: ['nfc-tags'],
    queryFn: fetchNfcTags,
  });
}

export function useCreateNfcTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: NFCTagCreate) => createNfcTag(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfc-tags'] });
      toast.success('Tag added');
    },
    onError: () => toast.error('Failed to add tag'),
  });
}

export function useUpdateNfcTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<NFCTagCreate> }) =>
      updateNfcTag(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfc-tags'] });
      toast.success('Tag updated');
    },
    onError: () => toast.error('Failed to update tag'),
  });
}

export function useDeleteNfcTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNfcTag(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['nfc-tags'] });
      toast.success('Tag removed');
    },
    onError: () => toast.error('Failed to remove tag'),
  });
}

// ---------------------------------------------------------------------------
// IoT Receipt Scanner — remote capture trigger
// ---------------------------------------------------------------------------
//
// Sends a "shoot" command to the backend, which the ESP32-CAM firmware picks
// up on its next poll cycle (≤ 2 s). The device then captures a JPEG and
// uploads it via /api/v1/iot/ingest/receipt/, creating a pending Receipt.
//
// No invalidation needed on success: the receipt list will refresh on its
// own 30 s poll interval (configured in useReceipts). A toast tells the user
// to watch the Receipts page.
//
// Requires backend: POST /api/v1/iot/devices/{id}/capture/ to exist.
// To remove: delete this hook and remove the "Capture now" button from
// src/pages/IoTDevicesPage.tsx. Also remove triggerCapture from api/iot.ts.

export function useTriggerCapture() {
  return useMutation({
    mutationFn: (deviceId: number) => triggerCapture(deviceId),
    onSuccess: () =>
      toast.success('Capture triggered — check the Receipts page in a few seconds'),
    onError: () =>
      toast.error(
        'Could not trigger capture. Make sure the backend capture endpoint is deployed.',
      ),
  });
}

// ---------------------------------------------------------------------------
// Pairing claim
// ---------------------------------------------------------------------------

export function useClaimPairingCode() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PairingClaim) => claimPairingCode(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['iot-devices'] });
      // Toast is fired by the page after it shows the one-time api_key,
      // so the user doesn't see "paired" before the key reveal.
    },
    // Error is rendered inline in the pair form — different HTTP codes
    // map to different user-facing copy (404 / 410 / 409). No toast.
  });
}
