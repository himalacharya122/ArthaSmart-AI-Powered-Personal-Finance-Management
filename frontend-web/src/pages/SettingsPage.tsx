import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { User, Lock, Globe, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { updateProfile, changePassword } from '@/api/auth';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { Button } from '@/components/common/Button';
import { CURRENCIES } from '@/utils/constants';
import type { ProfileUpdateRequest, PasswordChangeRequest } from '@/types/auth';
import toast from 'react-hot-toast';

function ProfileSection() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileUpdateRequest>({
    defaultValues: {
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      phone_number: user?.phone_number || '',
      preferred_currency: user?.preferred_currency || 'NPR',
      timezone: user?.timezone || 'Asia/Kathmandu',
    },
  });

  async function onSubmit(data: ProfileUpdateRequest) {
    setSaving(true);
    try {
      const updated = await updateProfile(data);
      setUser(updated);
      toast.success('Profile updated');
    } catch {
      toast.error('Failed to update profile');
    }
    setSaving(false);
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-100">
          <User className="h-5 w-5 text-accent-600" />
        </div>
        <div>
          <h2 className="font-semibold text-primary-800">Profile</h2>
          <p className="text-xs text-primary-400">Update your personal information</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="First Name"
            error={errors.first_name?.message}
            {...register('first_name', { required: 'Required' })}
          />
          <Input
            label="Last Name"
            error={errors.last_name?.message}
            {...register('last_name', { required: 'Required' })}
          />
        </div>
        <Input
          label="Phone Number"
          placeholder="+977-XXXXXXXXXX"
          {...register('phone_number')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
              Currency
            </label>
            <select
              className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register('preferred_currency')}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.symbol} {c.name} ({c.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
              Timezone
            </label>
            <select
              className="mt-1 block w-full rounded-md border border-primary-200 bg-white px-3 py-2.5 text-sm text-primary-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              {...register('timezone')}
            >
              <option value="Asia/Kathmandu">Asia/Kathmandu (NPT)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="America/New_York">America/New York (EST)</option>
              <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Europe/Berlin">Europe/Berlin (CET)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="Australia/Sydney">Australia/Sydney (AEST)</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="accent" loading={saving}>Save Changes</Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordSection() {
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, getValues, formState: { errors } } = useForm<PasswordChangeRequest>();

  async function onSubmit(data: PasswordChangeRequest) {
    setSaving(true);
    try {
      await changePassword(data);
      toast.success('Password changed');
      reset();
    } catch {
      toast.error('Failed to change password. Check your current password.');
    }
    setSaving(false);
  }

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning-100">
          <Lock className="h-5 w-5 text-warning-600" />
        </div>
        <div>
          <h2 className="font-semibold text-primary-800">Change Password</h2>
          <p className="text-xs text-primary-400">Keep your account secure</p>
        </div>
      </div>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Current Password"
          type="password"
          error={errors.old_password?.message}
          {...register('old_password', { required: 'Required' })}
        />
        <Input
          label="New Password"
          type="password"
          error={errors.new_password?.message}
          {...register('new_password', {
            required: 'Required',
            minLength: { value: 8, message: 'Must be at least 8 characters' },
          })}
        />
        <Input
          label="Confirm New Password"
          type="password"
          error={errors.new_password_confirm?.message}
          {...register('new_password_confirm', {
            required: 'Required',
            validate: (v) => v === getValues('new_password') || 'Passwords do not match',
          })}
        />
        <div className="flex justify-end pt-2">
          <Button type="submit" variant="accent" loading={saving}>Update Password</Button>
        </div>
      </form>
    </Card>
  );
}

function AccountInfoSection() {
  const user = useAuthStore((s) => s.user);

  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-100">
          <Globe className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <h2 className="font-semibold text-primary-800">Account Information</h2>
          <p className="text-xs text-primary-400">Your account details</p>
        </div>
      </div>
      <div className="space-y-3 text-sm">
        <div className="flex justify-between border-b border-primary-50 pb-2">
          <span className="text-primary-500">Email</span>
          <span className="font-medium text-primary-800">{user?.email}</span>
        </div>
        <div className="flex justify-between border-b border-primary-50 pb-2">
          <span className="text-primary-500">Username</span>
          <span className="font-medium text-primary-800">{user?.username}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-primary-500">Member since</span>
          <span className="font-medium text-primary-800">
            {user?.date_joined ? new Date(user.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
          </span>
        </div>
      </div>
    </Card>
  );
}

function DangerZone() {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-danger-50">
          <Trash2 className="h-5 w-5 text-danger-500" />
        </div>
        <div>
          <h2 className="font-semibold text-danger-600">Danger Zone</h2>
          <p className="text-xs text-primary-400">Irreversible account actions</p>
        </div>
      </div>
      <p className="mb-4 text-sm text-primary-500">
        Deleting your account will permanently remove all your data including expenses, incomes, budgets, and conversations.
      </p>
      <Button variant="danger" disabled>
        <Trash2 className="h-4 w-4" /> Delete Account
      </Button>
    </Card>
  );
}

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Manage your account and preferences" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ProfileSection />
          <PasswordSection />
        </div>
        <div className="space-y-6">
          <AccountInfoSection />
          <DangerZone />
        </div>
      </div>
    </div>
  );
}
