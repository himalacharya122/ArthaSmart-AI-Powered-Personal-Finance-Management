import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { resetPassword } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
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
      <div className="min-h-screen bg-surface">
        {/* Header */}
        <nav className="sticky top-0 z-50 w-full border-b border-primary-950/20 bg-white/80 backdrop-blur-lg">
          <div className="flex h-16 items-center px-6">
            <Link to="/" className="text-lg font-bold text-primary-950">
              {APP_NAME}
            </Link>
          </div>
        </nav>

        <div className="flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md">
            <div className="rounded-xl bg-card p-8 shadow-sm text-left">
              <h1 className="text-2xl font-bold text-primary-800">
                Invalid reset link
              </h1>
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
      const message =
        axiosErr.response?.data?.detail ||
        'Reset failed. The link may have expired.';
      setError('root', { message });
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <nav className="sticky top-0 z-50 w-full border-b border-primary-950/20 bg-white/80 backdrop-blur-lg">
        <div className="mx-auto w-full max-w-5xl px-4">
          <div className="flex h-16 items-center">
            <Link to="/" className="text-lg font-bold text-primary-950">
              {APP_NAME}
            </Link>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex justify-center px-4 py-4 sm:py-16">
        <div className="w-full max-w-xl">
          <div
            className="bg-white text-left py-8 sm:p-12 sm:rounded-xl sm:border sm:border-primary-950/20 sm:shadow-[0_0_25px_rgba(0,0,0,0.1)] border-0 shadow-none rounded-none"
          >
            {/* Title */}
            <h1 className="text-2xl font-bold text-primary-950">
              Set new password
            </h1>
            <p className="mt-2 text-sm font-medium text-primary-950/70">
              Choose a strong password for your account
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
              {errors.root && (
                <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
                  {errors.root.message}
                </div>
              )}

              {/* New Password */}
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new password"
                  label="New Password"
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.new_password?.message}
                  {...register('new_password', {
                    required: 'Password is required',
                    minLength: {
                      value: 8,
                      message: 'At least 8 characters',
                    },
                  })}
                />

                <button
                  type="button"
                  className="absolute right-3 top-[38px] text-primary-950/50"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Confirm Password */}
              <div className="relative mt-5">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  label="Confirm New Password"
                  icon={<Lock className="h-4 w-4" />}
                  error={errors.new_password_confirm?.message}
                  {...register('new_password_confirm', {
                    required: 'Please confirm your password',
                    validate: (v) =>
                      v === getValues('new_password') ||
                      'Passwords do not match',
                  })}
                />

                <button
                  type="button"
                  className="absolute right-3 top-[38px] text-primary-950/50"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                variant="primary"
                size="lg"
                className="mt-8 rounded-lg"
              >
                Reset password
              </Button>

              <p className="mt-5 text-sm text-center text-primary-950/70">
                <Link
                  to="/login"
                  className="font-semibold text-primary-950/80 hover:text-primary-950"
                >
                  Back to Sign in
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-black">
        <div className="mx-auto w-full max-w-full px-6 py-6">
          <div className="flex flex-col items-center justify-between sm:flex-row">
            <Link to="/" className="flex items-center">
              <span className="font-semibold text-white">{APP_NAME}</span>
            </Link>
            <p className="text-sm text-white/70">
              &copy; 2026 {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}