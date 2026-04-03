import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft } from 'lucide-react';
import { forgotPassword } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { APP_NAME } from '@/utils/constants';
import type { ForgotPasswordRequest } from '@/types/auth';
import type { AxiosError } from 'axios';

export function ForgotPasswordPage() {
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    getValues,
  } = useForm<ForgotPasswordRequest>();

  async function onSubmit(data: ForgotPasswordRequest) {
    try {
      await forgotPassword({ email: data.email.toLowerCase() });
      setSent(true);
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const message = axiosErr.response?.data?.detail || 'Something went wrong. Please try again.';
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
          <h1 className="text-3xl font-bold text-primary-800">Reset password</h1>
          <p className="mt-1 text-primary-400">
            {sent
              ? 'Check your email for reset instructions'
              : "Enter your email and we'll send you a reset link"}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-xl bg-card p-8 shadow-sm">
          {sent ? (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
              <p className="text-sm text-primary-500">
                If an account exists for <span className="font-medium text-primary-700">{getValues('email')}</span>,
                you will receive a password reset email shortly.
              </p>
              <p className="text-xs text-primary-400">
                Don&apos;t see it? Check your spam folder.
              </p>
              <Link to="/login">
                <Button variant="primary" size="lg" fullWidth className="mt-4">
                  Back to Sign in
                </Button>
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {errors.root && (
                  <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-500">
                    {errors.root.message}
                  </div>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  placeholder="you@example.com"
                  icon={<Mail className="h-4 w-4" />}
                  error={errors.email?.message}
                  {...register('email', {
                    required: 'Email is required',
                    pattern: { value: /^\S+@\S+$/, message: 'Invalid email' },
                  })}
                />

                <Button type="submit" fullWidth loading={isSubmitting} variant="primary" size="lg">
                  Send reset link
                </Button>
              </form>

              <p className="mt-5 text-center text-sm text-primary-400">
                <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-primary-700 hover:text-primary-800">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Sign in
                </Link>
              </p>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-primary-300">
          &copy; 2026 {APP_NAME}. All rights reserved.
        </p>
      </div>
    </div>
  );
}
