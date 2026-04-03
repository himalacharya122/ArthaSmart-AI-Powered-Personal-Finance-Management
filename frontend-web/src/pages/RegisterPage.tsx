import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
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
        const message = axiosErr.response?.data?.detail || 'Registration failed. Please try again.';
        setError('root', { message });
      }
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface px-4 py-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-700 text-sm font-bold text-white">
              A
            </div>
            <span className="text-lg font-bold text-primary-800">{APP_NAME}</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold text-primary-800">Create your account</h1>
          <p className="mt-1 text-primary-400">Start tracking smarter. It takes under a minute.</p>
        </div>

        {/* Form card */}
        <div className="rounded-xl bg-card p-8 shadow-sm">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {errors.root && (
              <div className="rounded-md bg-danger-50 p-3 text-sm text-danger-500">
                {errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                placeholder="Himal"
                error={errors.first_name?.message}
                {...register('first_name', { required: 'Required' })}
              />
              <Input
                label="Last Name"
                placeholder="Acharya"
                error={errors.last_name?.message}
                {...register('last_name', { required: 'Required' })}
              />
            </div>

            <Input
              label="Username"
              placeholder="himal_acharya"
              error={errors.username?.message}
              {...register('username', {
                required: 'Username is required',
                minLength: { value: 3, message: 'At least 3 characters' },
              })}
            />

            <Input
              label="Email Address"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+$/, message: 'Invalid email' },
              })}
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide text-primary-600">
                Password
              </label>
              <div className="relative mt-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  className="block w-full rounded-md border border-primary-200 bg-white py-2.5 pl-3 pr-10 text-primary-800 placeholder-primary-300 transition-colors focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  {...register('password', {
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
              {errors.password && (
                <p className="mt-1 text-sm text-danger-500">{errors.password.message}</p>
              )}
            </div>

            <Input
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              error={errors.password_confirm?.message}
              {...register('password_confirm', {
                required: 'Please confirm your password',
                validate: (v) => v === getValues('password') || 'Passwords do not match',
              })}
            />

            <Button type="submit" fullWidth loading={isSubmitting} variant="primary" size="lg">
              Create account
            </Button>
          </form>

          {/* Divider */}
          <div className="my-5 flex items-center gap-4">
            <div className="h-px flex-1 bg-primary-100" />
            <span className="text-xs text-primary-400">or sign up with</span>
            <div className="h-px flex-1 bg-primary-100" />
          </div>

          {/* Google sign-up */}
          <button
            type="button"
            onClick={() => toast('Google sign-up coming soon!')}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-primary-200 bg-white px-4 py-2.5 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

          <p className="mt-4 text-center text-xs text-primary-400">
            By creating an account you agree to our{' '}
            <Link to="/terms" className="underline hover:text-primary-600">Terms of Service</Link>{' '}
            and{' '}
            <Link to="/privacy" className="underline hover:text-primary-600">Privacy Policy</Link>
          </p>

          <p className="mt-4 text-center text-sm text-primary-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary-700 hover:text-primary-800">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
