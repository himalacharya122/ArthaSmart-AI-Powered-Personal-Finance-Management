import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail } from 'lucide-react';
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
  const [otpValues, setOtpValues] = useState<string[]>(Array(6).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    setValue,
    watch,
  } = useForm<VerifyEmailRequest>({
    defaultValues: { email: emailFromState, code: '' },
  });

  const email = watch('email');

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

  function handleOtpChange(index: number, value: string) {
    const digit = value.replace(/\D/g, '');
    const newValues = [...otpValues];
    newValues[index] = digit ? digit[0] : '';
    setOtpValues(newValues);
    setValue('code', newValues.join(''));
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newValues = [...otpValues];
    text.split('').forEach((ch, i) => { newValues[i] = ch; });
    setOtpValues(newValues);
    setValue('code', newValues.join(''));
    const next = Math.min(text.length, 5);
    inputRefs.current[next]?.focus();
  }

  async function onSubmit(data: VerifyEmailRequest) {
    try {
      await verifyEmail({ email: data.email.toLowerCase(), code: data.code });
      toast.success('Email verified! You can now sign in.');
      navigate('/login');
    } catch (err) {
      const axiosErr = err as AxiosError<{ detail?: string }>;
      const message =
        axiosErr.response?.data?.detail || 'Verification failed. Please try again.';
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
              Verify your email
            </h1>
            <p className="mt-2 text-sm font-medium text-primary-950/70">
              {emailFromState ? (
                <>
                  We sent a 6-digit code to{' '}
                  <span className="font-semibold text-primary-950">{emailFromState}</span>
                </>
              ) : (
                'Enter your email and the 6-digit code we sent you'
              )}
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
              {errors.root && (
                <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
                  {errors.root.message}
                </div>
              )}

              {!emailFromState && (
                <div className="mb-5">
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
                </div>
              )}

              {emailFromState && <input type="hidden" {...register('email')} />}
              <input type="hidden" {...register('code', { required: 'Verification code is required', minLength: { value: 6, message: 'Enter all 6 digits' } })} />

              {/* OTP boxes */}
              <div>
                <label className="block text-sm font-bold text-primary-950/80 mb-2">
                  Verification code
                </label>
                <div className="flex gap-2 sm:gap-2.5">
                  {otpValues.map((val, i) => (
                    <input
                      key={i}
                      ref={(el) => { inputRefs.current[i] = el; }}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={val}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={handleOtpPaste}
                      className="w-full min-w-0 aspect-square text-center text-xl sm:text-2xl font-bold text-primary-950 border border-primary-950/25 rounded-lg focus:border-primary-950 focus:ring-1 focus:ring-primary-950 focus:outline-none bg-white"
                    />
                  ))}
                </div>
                {errors.code && (
                  <p className="mt-1.5 text-sm text-danger-600">{errors.code.message}</p>
                )}
              </div>

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                variant="primary"
                size="lg"
                className="mt-8 rounded-lg"
              >
                Verify email
              </Button>
            </form>

            <p className="mt-5 text-sm text-center text-primary-950/70">
              Didn't receive the code?{' '}
              {resendCooldown > 0 ? (
                <span className="font-semibold text-primary-950/50">
                  Resend in {resendCooldown}s
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resending}
                  className="font-semibold text-primary-950/80 hover:text-primary-950 disabled:opacity-50"
                >
                  {resending ? 'Sending...' : 'Resend code'}
                </button>
              )}
            </p>

            <p className="mt-4 text-sm text-center text-primary-950/70">
              <Link
                to="/login"
                className="font-semibold text-primary-950/80 hover:text-primary-950"
              >
                Back to Sign in
              </Link>
            </p>
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