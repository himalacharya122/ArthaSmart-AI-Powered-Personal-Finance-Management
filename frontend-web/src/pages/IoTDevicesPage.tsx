import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { isAxiosError } from 'axios';
import {
  Camera,
  Cpu,
  Copy,
  CreditCard,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
} from 'lucide-react';

import {
  useDevices,
  useDeleteDevice,
  useUpdateDevice,
  useRotateDeviceKey,
  useNfcTags,
  useCreateNfcTag,
  useUpdateNfcTag,
  useDeleteNfcTag,
  useClaimPairingCode,
} from '@/hooks/useIot';
import { useCategories } from '@/hooks/useCategories';
import { useAuthStore } from '@/store/authStore';

import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Input } from '@/components/common/Input';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';

import { cn } from '@/utils/cn';
import { formatCurrency, formatRelativeDate } from '@/utils/format';
import { CURRENCIES } from '@/utils/constants';

import type { Device, NFCTag, NFCTagCreate, PairingClaim } from '@/types/iot';
import toast from 'react-hot-toast';

type Tab = 'devices' | 'tags' | 'pair';

// ---------------------------------------------------------------------------
// Small UI helpers
// ---------------------------------------------------------------------------

function DeviceTypeBadge({ type }: { type: Device['device_type'] }) {
  if (type === 'receipt_scanner') {
    return (
      <Badge variant="info" className="gap-1">
        <Camera className="h-3 w-3" /> Receipt Scanner
      </Badge>
    );
  }
  return (
    <Badge variant="info" className="gap-1">
      <CreditCard className="h-3 w-3" /> NFC Logger
    </Badge>
  );
}

async function copyToClipboard(value: string, label = 'Copied') {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(label);
  } catch {
    toast.error('Copy failed — select and copy manually');
  }
}

// ---------------------------------------------------------------------------
// Devices tab
// ---------------------------------------------------------------------------

function DeviceRenameForm({
  device,
  onSubmit,
  onCancel,
  loading,
}: {
  device: Device;
  onSubmit: (name: string) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<{ name: string }>({
    defaultValues: { name: device.name },
  });
  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d.name))} className="space-y-4">
      <Input
        label="Device name"
        placeholder="e.g. Kitchen Scanner"
        error={errors.name?.message}
        {...register('name', { required: 'Name is required' })}
      />
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="accent" loading={loading}>Save</Button>
      </div>
    </form>
  );
}

function DevicesTab({ onGoToPair }: { onGoToPair: () => void }) {
  const { data, isLoading } = useDevices();
  const updateMut = useUpdateDevice();
  const deleteMut = useDeleteDevice();
  const rotateMut = useRotateDeviceKey();

  const [renaming, setRenaming] = useState<Device | null>(null);
  const [deleting, setDeleting] = useState<Device | null>(null);
  const [rotating, setRotating] = useState<Device | null>(null);
  const [rotatedKey, setRotatedKey] = useState<string | null>(null);

  const devices = data?.results || [];

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
      </div>
    );
  }

  if (devices.length === 0) {
    return (
      <EmptyState
        icon={<Cpu className="h-12 w-12" />}
        title="No paired devices"
        description="Flash the ESP32 firmware from the iot/ folder, then pair it from the Pair a Device tab."
        actionLabel="Pair a device"
        onAction={onGoToPair}
      />
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {devices.map((d) => (
          <Card key={d.id} padding="md" className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-primary-950 truncate">{d.name}</p>
                <div className="mt-1">
                  <DeviceTypeBadge type={d.device_type} />
                </div>
              </div>
              {d.is_active ? (
                <Badge variant="success">Active</Badge>
              ) : (
                <Badge variant="neutral">Disabled</Badge>
              )}
            </div>

            <dl className="space-y-1 text-xs text-primary-950/70">
              <div className="flex justify-between gap-2">
                <dt>Hardware ID</dt>
                <dd className="truncate font-mono">{d.device_id}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Last seen</dt>
                <dd>{d.last_seen ? formatRelativeDate(d.last_seen) : 'never'}</dd>
              </div>
              {d.firmware_version && (
                <div className="flex justify-between gap-2">
                  <dt>Firmware</dt>
                  <dd>{d.firmware_version}</dd>
                </div>
              )}
            </dl>

            <div className="mt-auto flex flex-wrap gap-2 pt-2">
              <button
                onClick={() => setRenaming(d)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary-950/80 hover:bg-primary-50"
              >
                <Pencil className="h-3.5 w-3.5" /> Rename
              </button>
              <button
                onClick={() =>
                  updateMut.mutate({ id: d.id, data: { is_active: !d.is_active } })
                }
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary-950/80 hover:bg-primary-50"
              >
                {d.is_active ? 'Disable' : 'Enable'}
              </button>
              <button
                onClick={() => setRotating(d)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary-950/80 hover:bg-primary-50"
              >
                <RefreshCw className="h-3.5 w-3.5" /> Rotate key
              </button>
              <button
                onClick={() => setDeleting(d)}
                className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger-600 hover:bg-danger-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </div>
          </Card>
        ))}
      </div>

      {/* Rename */}
      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename device">
        {renaming && (
          <DeviceRenameForm
            device={renaming}
            loading={updateMut.isPending}
            onCancel={() => setRenaming(null)}
            onSubmit={(name) =>
              updateMut.mutate(
                { id: renaming.id, data: { name } },
                { onSuccess: () => setRenaming(null) },
              )
            }
          />
        )}
      </Modal>

      {/* Rotate key confirm → reveal */}
      <Modal
        open={!!rotating}
        onClose={() => {
          setRotating(null);
          setRotatedKey(null);
        }}
        title={rotatedKey ? 'New API key' : 'Rotate API key'}
      >
        {rotating && !rotatedKey && (
          <>
            <p className="text-sm text-primary-950/70">
              The device&apos;s current key will stop working immediately. The device
              will need to pair again — it&apos;ll detect the 401, wipe its NVS, and
              show a fresh 6-digit pairing code on its serial monitor.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRotating(null)}>Cancel</Button>
              <Button
                variant="accent"
                loading={rotateMut.isPending}
                onClick={() =>
                  rotateMut.mutate(rotating.id, {
                    onSuccess: (r) => setRotatedKey(r.api_key),
                  })
                }
              >
                <RefreshCw className="h-4 w-4" /> Rotate
              </Button>
            </div>
          </>
        )}
        {rotatedKey && (
          <>
            <p className="text-sm text-primary-950/70">
              Copy this key now — it will not be shown again. Give it to the
              device via re-pairing.
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-md border border-primary-950/20 bg-primary-50 px-3 py-2">
              <code className="flex-1 truncate font-mono text-xs text-primary-950">
                {rotatedKey}
              </code>
              <button
                onClick={() => copyToClipboard(rotatedKey, 'API key copied')}
                className="rounded p-1 text-primary-950/70 hover:bg-primary-100"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-6 flex justify-end">
              <Button
                variant="accent"
                onClick={() => {
                  setRotating(null);
                  setRotatedKey(null);
                }}
              >
                Done
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* Delete */}
      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Remove device" size="sm">
        <p className="text-sm text-primary-950/70">
          Remove &quot;{deleting?.name}&quot;? The device will stop being able to
          send data — re-pair it from scratch if you want it back later.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            loading={deleteMut.isPending}
            onClick={() =>
              deleting &&
              deleteMut.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
            }
          >
            Remove
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// NFC tags tab
// ---------------------------------------------------------------------------

function NfcTagForm({
  tag,
  onSubmit,
  onCancel,
  loading,
}: {
  tag?: NFCTag | null;
  onSubmit: (data: NFCTagCreate) => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  const user = useAuthStore((s) => s.user);
  const { data: categoriesData } = useCategories('expense');
  const categories = categoriesData?.results || [];

  const { register, handleSubmit, formState: { errors } } = useForm<NFCTagCreate>({
    defaultValues: tag
      ? {
          tag_uid: tag.tag_uid,
          label: tag.label,
          category_id: tag.category?.id ?? null,
          default_amount: tag.default_amount,
          default_currency: tag.default_currency,
          merchant: tag.merchant,
          description: tag.description,
          is_active: tag.is_active,
        }
      : {
          default_currency: user?.preferred_currency || 'NPR',
          is_active: true,
        },
  });

  return (
    <form
      onSubmit={handleSubmit((d) =>
        onSubmit({
          ...d,
          // Empty-string → null so DRF doesn't try to cast "" to an FK id.
          category_id: d.category_id ? Number(d.category_id) : null,
        }),
      )}
      className="space-y-4"
    >
      <Input
        label="Tag UID"
        placeholder="e.g. 04:AA:BB:CC"
        error={errors.tag_uid?.message}
        {...register('tag_uid', { required: 'Tag UID is required' })}
      />
      <Input
        label="Label"
        placeholder="e.g. Morning Coffee"
        error={errors.label?.message}
        {...register('label', { required: 'Label is required' })}
      />

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2">
          <Input
            label="Default amount"
            type="number"
            step="0.01"
            placeholder="150.00"
            error={errors.default_amount?.message}
            {...register('default_amount', { required: 'Amount is required' })}
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-primary-950/80">Currency</label>
          <select
            className="mt-2 block w-full rounded-md border border-primary-950/20 bg-white py-3 px-3 text-primary-950 focus:border-primary-950/40 focus:outline-none focus:ring-0"
            {...register('default_currency')}
          >
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>{c.code}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-primary-950/80">Category (optional)</label>
        <select
          className="mt-2 block w-full rounded-md border border-primary-950/20 bg-white py-3 px-3 text-primary-950 focus:border-primary-950/40 focus:outline-none focus:ring-0"
          defaultValue={tag?.category?.id ?? ''}
          {...register('category_id')}
        >
          <option value="">— None —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <Input
        label="Merchant (optional)"
        placeholder="e.g. Himalayan Java"
        {...register('merchant')}
      />

      <div>
        <label className="block text-sm font-bold text-primary-950/80">Description (optional)</label>
        <textarea
          rows={2}
          className="mt-2 block w-full rounded-md border border-primary-950/20 bg-white py-3 px-3 text-primary-950 focus:border-primary-950/40 focus:outline-none focus:ring-0"
          {...register('description')}
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="accent" loading={loading}>
          {tag ? 'Update' : 'Create tag'}
        </Button>
      </div>
    </form>
  );
}

function NfcTagsTab() {
  const { data, isLoading } = useNfcTags();
  const createMut = useCreateNfcTag();
  const updateMut = useUpdateNfcTag();
  const deleteMut = useDeleteNfcTag();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<NFCTag | null>(null);
  const [deleting, setDeleting] = useState<NFCTag | null>(null);

  const tags = data?.results || [];

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button
          variant="accent"
          onClick={() => { setEditing(null); setFormOpen(true); }}
        >
          <Plus className="h-4 w-4" /> Add tag
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : tags.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title="No NFC tags"
          description="Register a tag here, then tap it with the NFC logger to auto-log the expense."
          actionLabel="Add tag"
          onAction={() => setFormOpen(true)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {tags.map((t) => (
            <Card key={t.id} padding="md" className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-primary-950 truncate">{t.label}</p>
                  <p className="mt-1 font-mono text-xs text-primary-950/60 truncate">
                    {t.tag_uid}
                  </p>
                </div>
                {t.is_active ? (
                  <Badge variant="success">Active</Badge>
                ) : (
                  <Badge variant="neutral">Disabled</Badge>
                )}
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-lg font-semibold text-primary-950">
                  {formatCurrency(t.default_amount, t.default_currency)}
                </span>
                {t.merchant && (
                  <span className="text-xs text-primary-950/60 truncate">
                    @ {t.merchant}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {t.category && (
                  <span className="inline-flex items-center gap-1 text-xs text-primary-950/70">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: t.category.color || '#94a3b8' }}
                    />
                    {t.category.name}
                  </span>
                )}
                <Badge variant="neutral">{t.tap_count} taps</Badge>
              </div>

              <div className="mt-auto flex justify-end gap-1 pt-2">
                <button
                  onClick={() => { setEditing(t); setFormOpen(true); }}
                  className="rounded p-1 text-primary-950/60 hover:bg-primary-50 hover:text-primary-950"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleting(t)}
                  className="rounded p-1 text-primary-950/60 hover:bg-danger-50 hover:text-danger-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditing(null); }}
        title={editing ? 'Edit tag' : 'Add tag'}
      >
        <NfcTagForm
          tag={editing}
          loading={createMut.isPending || updateMut.isPending}
          onCancel={() => { setFormOpen(false); setEditing(null); }}
          onSubmit={(data) => {
            if (editing) {
              updateMut.mutate(
                { id: editing.id, data },
                { onSuccess: () => { setFormOpen(false); setEditing(null); } },
              );
            } else {
              createMut.mutate(data, { onSuccess: () => setFormOpen(false) });
            }
          }}
        />
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Remove tag" size="sm">
        <p className="text-sm text-primary-950/70">
          Remove &quot;{deleting?.label}&quot;? Already-logged expenses stay intact,
          but tapping this tag again will return 404 until you add it back.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            variant="danger"
            loading={deleteMut.isPending}
            onClick={() =>
              deleting &&
              deleteMut.mutate(deleting.id, { onSuccess: () => setDeleting(null) })
            }
          >
            Remove
          </Button>
        </div>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Pair tab
// ---------------------------------------------------------------------------

function PairTab({ onPaired }: { onPaired: () => void }) {
  const claimMut = useClaimPairingCode();
  const [result, setResult] = useState<{ name: string; apiKey: string; type: Device['device_type'] } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<PairingClaim>({
    defaultValues: { pairing_code: '', name: '' },
  });

  function submit(data: PairingClaim) {
    setFormError(null);
    claimMut.mutate(data, {
      onSuccess: (device) => {
        setResult({
          name: device.name,
          apiKey: device.api_key,
          type: device.device_type,
        });
        reset();
        toast.success('Device paired');
      },
      onError: (err) => {
        // Map backend status codes to user-facing copy. See
        // backend/apps/iot/pairing.py::PairingClaimView.
        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 404) {
            setFormError('No pending pairing matches that code. Generate a fresh code on the device.');
            return;
          }
          if (status === 410) {
            setFormError('This code has expired. Restart the device to generate a new one.');
            return;
          }
          if (status === 409) {
            setFormError('This hardware is already paired under a different device. Remove the old one first.');
            return;
          }
        }
        setFormError('Pairing failed. Please try again.');
      },
    });
  }

  if (result) {
    return (
      <Card padding="lg" className="mx-auto max-w-xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <KeyRound className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-primary-950">
              &quot;{result.name}&quot; is paired
            </h2>
            <p className="text-sm text-primary-950/60">
              {result.type === 'receipt_scanner' ? 'Receipt scanner' : 'NFC logger'} — ready to use.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-md border border-warning-400 bg-warning-50 p-4">
          <p className="text-sm font-semibold text-warning-700">
            Copy the API key now.
          </p>
          <p className="mt-1 text-xs text-warning-700/80">
            It will not be shown again in this app. The device will pick it up
            on its next /pair/status/ poll, so you don&apos;t actually need to
            paste it anywhere — but keep this window open until the device
            triple-beeps OK.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-warning-400 bg-white px-3 py-2">
            <code className="flex-1 truncate font-mono text-xs text-primary-950">
              {result.apiKey}
            </code>
            <button
              onClick={() => copyToClipboard(result.apiKey, 'API key copied')}
              className="rounded p-1 text-primary-950/70 hover:bg-primary-100"
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={() => setResult(null)}
          >
            Pair another
          </Button>
          <Button variant="accent" onClick={onPaired}>
            Done
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card padding="lg" className="mx-auto max-w-xl">
      <h2 className="text-lg font-semibold text-primary-950">Pair a new device</h2>
      <p className="mt-1 text-sm text-primary-950/60">
        Power on the ESP32. It will print a 6-digit code on its serial monitor
        (and blink/beep while waiting). Enter the code below.
      </p>

      <form onSubmit={handleSubmit(submit)} className="mt-6 space-y-4">
        <Input
          label="Pairing code"
          inputMode="numeric"
          placeholder="123456"
          maxLength={6}
          error={errors.pairing_code?.message}
          {...register('pairing_code', {
            required: 'Enter the 6-digit code from the device',
            pattern: { value: /^\d{6}$/, message: 'Must be exactly 6 digits' },
          })}
        />
        <Input
          label="Device name"
          placeholder="e.g. Kitchen Scanner"
          error={errors.name?.message}
          {...register('name', { required: 'Give the device a name' })}
        />

        {formError && (
          <div className="rounded-md border border-danger-100 bg-danger-50 px-3 py-2 text-sm text-danger-600">
            {formError}
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button type="submit" variant="accent" loading={claimMut.isPending}>
            Pair device
          </Button>
        </div>
      </form>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Page shell
// ---------------------------------------------------------------------------

export function IoTDevicesPage() {
  const [tab, setTab] = useState<Tab>('devices');

  const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'devices', label: 'Devices', icon: Smartphone },
    { id: 'tags', label: 'NFC Tags', icon: CreditCard },
    { id: 'pair', label: 'Pair a Device', icon: Plus },
  ];

  return (
    <div>
      <PageHeader
        title="IoT Devices"
        description="Manage your ArthaSmart hardware — receipt scanners and NFC loggers."
      />

      <div className="mb-6 flex gap-1 rounded-lg bg-primary-100 p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'bg-white text-primary-800 shadow-sm'
                : 'text-primary-500 hover:text-primary-700',
            )}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'devices' && <DevicesTab onGoToPair={() => setTab('pair')} />}
      {tab === 'tags' && <NfcTagsTab />}
      {tab === 'pair' && <PairTab onPaired={() => setTab('devices')} />}
    </div>
  );
}
