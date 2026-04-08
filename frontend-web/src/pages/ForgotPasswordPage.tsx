import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
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
      const message =
        axiosErr.response?.data?.detail ||
        'Something went wrong. Please try again.';
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
          <div className="bg-white text-left py-8 sm:p-12 sm:rounded-xl sm:border sm:border-primary-950/20 sm:shadow-[0_0_25px_rgba(0,0,0,0.1)] border-0 shadow-none rounded-none">
            
            {/* Title */}
            <h1 className="text-2xl font-bold text-primary-950">
              Reset password
            </h1>
            <p className="mt-2 text-sm font-medium text-primary-950/70">
              {sent
                ? 'Check your email for reset instructions'
                : "Enter your email and we'll send you a reset link"}
            </p>

            {sent ? (
              <div className="mt-8">
                <p className="mt-4 text-sm font-medium text-primary-950/70">
                  If an account exists for{' '}
                  <span className="font-semibold text-primary-950">
                    {getValues('email')}
                  </span>
                  , you will receive a password reset email shortly.
                </p>

                <p className="mt-4 text-xs font-semibold text-primary-950/70">
                  Don&apos;t see it?{' '}
                  <span className="font-semibold text-primary-950">
                     Check your spam folder.
                  </span>
                </p>

                <Link to="/login">
                  <Button
                    variant="primary"
                    size="lg"
                    fullWidth
                    className="mt-6 rounded-lg"
                  >
                    Back to Sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
                {errors.root && (
                  <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
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
                    pattern: {
                      value: /^\S+@\S+$/,
                      message: 'Invalid email',
                    },
                  })}
                />

                <Button
                  type="submit"
                  fullWidth
                  loading={isSubmitting}
                  variant="primary"
                  size="lg"
                  className="mt-8 rounded-lg"
                >
                  Send reset link
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
            )}
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