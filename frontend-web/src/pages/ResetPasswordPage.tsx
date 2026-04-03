import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { resetPassword } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { APP_NAME } from '@/utils/constants';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

interface ResetForm {
  new_password: string;
  new_password_confirm: string;
}

export function ResetPasswordPage() {
  const { uid, token } = useParams<{ uid: string; token: string }>();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    getValues,
  } = useForm<ResetForm>();

  if (!uid || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-xl bg-card p-8 shadow-sm">
            <h1 className="text-2xl font-bold text-primary-800">Invalid reset link</h1>
            <p className="mt-2 text-sm text-primary-400">
              This password reset link is invalid or has expired.
            </p>
            <Link to="/forgot-password">
              <Button variant="primary" size="lg" fullWidth className="mt-6">
                Request a new link
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  async function onSubmit(data: ResetForm) {
    try {
      await resetPassword({
        uid: uid!,
        token: token!,
        new_password: data.new_password,
        new_password_confirm: data.new_password_confirm,
      });
      toast.success('Password reset successfully! You can now sign in.');
      navigate('/login');
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const message = axiosErr.response?.data?.detail || 'Reset failed. The link may have expired.';
      setError('root', { message });
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-700 text-lg font-bold text-white">
            A
          </div>
          <h1 className="text-3xl font-bold text-primary-800">Set new password</h1>
          <p className="mt-1 text-primary-400">Choose a strong password for your account</p>
        </div>

        {/* Form card */}
        <div className="rounded-xl bg-card p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-500">
                {errors.root.message}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
                New Password
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-400 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  className="block w-full rounded-md border border-primary-200 bg-white py-2.5 pl-10 pr-10 text-primary-800 placeholder-primary-300 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  {...register('new_password', {
                    required: 'Password is required',
                    minLength: { value: 8, message: 'At least 8 characters' },
                  })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-primary-400"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.new_password && (
                <p className="mt-1 text-sm text-danger-500">{errors.new_password.message}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
                Confirm New Password
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-400 pointer-events-none">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  placeholder="Confirm new password"
                  className="block w-full rounded-md border border-primary-200 bg-white py-2.5 pl-10 pr-3 text-primary-800 placeholder-primary-300 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  {...register('new_password_confirm', {
                    required: 'Please confirm your password',
                    validate: (v) => v === getValues('new_password') || 'Passwords do not match',
                  })}
                />
              </div>
              {errors.new_password_confirm && (
                <p className="mt-1 text-sm text-danger-500">{errors.new_password_confirm.message}</p>
              )}
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} variant="primary" size="lg">
              Reset password
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-primary-400">
            <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-800">
              Back to Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-primary-300">
          &copy; 2026 {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
