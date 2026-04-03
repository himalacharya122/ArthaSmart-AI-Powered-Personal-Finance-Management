import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, ShieldCheck } from 'lucide-react';
import { verifyEmail, resendVerification } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { APP_NAME } from '@/utils/constants';
import type { VerifyEmailRequest } from '@/types/auth';
import type { AxiosError } from 'axios';
import toast from 'react-hot-toast';

export function VerifyEmailPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromState = (location.state as { email?: string })?.email || '';

  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<VerifyEmailRequest>({
    defaultValues: { email: emailFromState, code: '' },
  });

  const email = watch('email');

  // Cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      intervalRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(intervalRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resendCooldown]);

  async function onSubmit(data: VerifyEmailRequest) {
    try {
      await verifyEmail({ email: data.email.toLowerCase(), code: data.code });
      toast.success('Email verified! You can now sign in.');
      navigate('/login');
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const message = axiosErr.response?.data?.detail || 'Verification failed. Please try again.';
      setError('root', { message });
    }
  }

  async function handleResend() {
    if (!email) {
      setError('email', { message: 'Enter your email to resend' });
      return;
    }
    setResending(true);
    try {
      await resendVerification({ email: email.toLowerCase() });
      toast.success('A new verification code has been sent.');
      setResendCooldown(60);
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      toast.error(axiosErr.response?.data?.detail || 'Failed to resend code.');
    } finally {
      setResending(false);
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
          <h1 className="text-3xl font-bold text-primary-800">Verify your email</h1>
          <p className="mt-1 text-primary-400">
            {emailFromState
              ? <>We sent a 6-digit code to <span className="font-medium text-primary-600">{emailFromState}</span></>
              : 'Enter your email and the 6-digit code we sent you'}
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-xl bg-card p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errors.root && (
              <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-500">
                {errors.root.message}
              </div>
            )}

            {!emailFromState && (
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
            )}

            {emailFromState && (
              <input type="hidden" {...register('email')} />
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
                Verification Code
              </label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary-400 pointer-events-none">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  className="block w-full rounded-md border border-primary-200 bg-white py-2.5 pl-10 pr-3 text-center text-2xl font-bold tracking-[0.5em] text-primary-800 placeholder-primary-300 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  {...register('code', {
                    required: 'Verification code is required',
                    minLength: { value: 6, message: 'Code must be 6 digits' },
                    maxLength: { value: 6, message: 'Code must be 6 digits' },
                    pattern: { value: /^\d{6}$/, message: 'Code must be 6 digits' },
                  })}
                />
              </div>
              {errors.code && (
                <p className="mt-1 text-sm text-danger-500">{errors.code.message}</p>
              )}
            </div>

            <Button type="submit" fullWidth loading={isSubmitting} variant="primary" size="lg">
              Verify Email
            </Button>
          </form>

          {/* Resend */}
          <div className="mt-5 text-center">
            <p className="text-sm text-primary-400">
              Didn&apos;t receive the code?{' '}
              {resendCooldown > 0 ? (
                <span className="text-primary-500">Resend in {resendCooldown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-primary-700 hover:text-primary-800 disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </p>
          </div>

          <p className="mt-4 text-center text-sm text-primary-400">
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
