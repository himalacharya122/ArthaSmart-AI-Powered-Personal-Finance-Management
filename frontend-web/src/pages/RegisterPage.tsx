import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { register as registerApi } from '@/api/auth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { APP_NAME } from '@/utils/constants';
import type { RegisterRequest } from '@/types/auth';
import type { AxiosError } from 'axios';
import type { ApiError } from '@/types/api';
import toast from 'react-hot-toast';

export function RegisterPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
    getValues,
  } = useForm<RegisterRequest>();

  async function onSubmit(data: RegisterRequest) {
    try {
      await registerApi(data);
      toast.success('Account created! Check your email for a verification code.');
      navigate('/verify-email', { state: { email: data.email } });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiError>;
      const apiErrors = axiosErr.response?.data?.errors;

      if (apiErrors) {
        Object.entries(apiErrors).forEach(([field, messages]) => {
          setError(field as keyof RegisterRequest, { message: messages[0] });
        });
      } else {
        const message =
          axiosErr.response?.data?.detail ||
          'Registration failed. Please try again.';
        setError('root', { message });
      }
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
        <div className="w-full max-w-2xl">
          <div className="bg-white text-left py-8 sm:p-12 sm:rounded-xl sm:border sm:border-primary-950/20 sm:shadow-[0_0_25px_rgba(0,0,0,0.1)] border-0 shadow-none rounded-none">

            {/* Title */}
            <h1 className="text-xl font-bold text-primary-950/80">
              Create your account
            </h1>

            <form onSubmit={handleSubmit(onSubmit)} className="mt-8">
              {errors.root && (
                <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-600">
                  {errors.root.message}
                </div>
              )}

              {/* Name */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input
                  label="First Name"
                  placeholder="John"
                  icon={<User className="h-4 w-4" />}
                  error={errors.first_name?.message}
                  {...register('first_name', { required: 'Required' })}
                />
                <Input
                  label="Last Name"
                  placeholder="Doe"
                  icon={<User className="h-4 w-4" />}
                  error={errors.last_name?.message}
                  {...register('last_name', { required: 'Required' })}
                />
              </div>

              {/* Username */}
              <div className="mb-4">
                <Input
                  label="Username"
                  placeholder="john_doe"
                  icon={<User className="h-4 w-4" />}
                  error={errors.username?.message}
                  {...register('username', {
                    required: 'Username is required',
                    minLength: { value: 3, message: 'At least 3 characters' },
                  })}
                />
              </div>

              {/* Email */}
              <div className="mb-4">
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

              {/* Password */}
              <div className="mt-5 mb-4">
                <label className="block text-sm font-bold text-primary-950/80">
                  Password
                </label>

                <div className="relative mt-2">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    icon={<Lock className="h-4 w-4" />}
                    error={errors.password?.message}
                    {...register('password', {
                      required: 'Password is required',
                      minLength: { value: 8, message: 'At least 8 characters' },
                    })}
                  />

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-950/50"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-primary-950/80">
                  Confirm Password
                </label>

                <div className="relative mt-2">
                  <Input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your password"
                    icon={<Lock className="h-4 w-4" />}
                    error={errors.password_confirm?.message}
                    {...register('password_confirm', {
                      required: 'Please confirm your password',
                      validate: (v) =>
                        v === getValues('password') ||
                        'Passwords do not match',
                    })}
                  />

                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-950/50"
                    onClick={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                fullWidth
                loading={isSubmitting}
                variant="primary"
                size="lg"
                className="mt-6 rounded-lg"
              >
                Create account
              </Button>

              <p className="mt-5 text-sm text-center text-primary-950/70">
                Already have an account?{' '}
                <Link
                  to="/login"
                  className="font-semibold text-primary-950 underline"
                >
                  Sign in
                </Link>
              </p>
            </form>

            {/* Divider */}
            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-primary-950/20" />
              <span className="text-xs text-primary-950/50 font-medium">
                or continue with
              </span>
              <div className="h-px flex-1 bg-primary-950/20" />
            </div>

            {/* Google */}
            <button
              type="button"
              onClick={() => toast('Google sign-up coming soon!')}
              className="flex w-full items-center justify-center gap-3 rounded-md border border-primary-950/20 bg-white px-4 py-3 text-sm font-medium text-primary-950 hover:bg-primary-50"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Terms */}
            <p className="mt-5 text-center text-xs text-primary-950/60">
              By creating an account you agree to our{' '}
              <Link to="/terms" className="font-semibold underline text-primary-950">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="font-semibold underline text-primary-950">
                Privacy Policy
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