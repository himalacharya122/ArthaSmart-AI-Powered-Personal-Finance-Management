import apiClient from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  PasswordChangeRequest,
  ProfileUpdateRequest,
  User,
  VerifyEmailRequest,
  ResendVerificationRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from '@/types/auth';

export async function login(data: LoginRequest): Promise<LoginResponse> {
  const res = await apiClient.post<LoginResponse>('/auth/login/', data);
  return res.data;
}

export async function register(data: RegisterRequest): Promise<RegisterResponse> {
  const res = await apiClient.post<RegisterResponse>('/auth/register/', data);
  return res.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await apiClient.post('/auth/logout/', { refresh: refreshToken });
}

export async function getProfile(): Promise<User> {
  const res = await apiClient.get<User>('/auth/profile/');
  return res.data;
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<User> {
  const res = await apiClient.patch<User>('/auth/profile/', data);
  return res.data;
}

export async function changePassword(data: PasswordChangeRequest): Promise<void> {
  await apiClient.post('/auth/password/change/', data);
}

export async function verifyEmail(data: VerifyEmailRequest): Promise<{ detail: string }> {
  const res = await apiClient.post<{ detail: string }>('/auth/verify-email/', data);
  return res.data;
}

export async function resendVerification(data: ResendVerificationRequest): Promise<{ detail: string }> {
  const res = await apiClient.post<{ detail: string }>('/auth/resend-verification/', data);
  return res.data;
}

export async function forgotPassword(data: ForgotPasswordRequest): Promise<{ detail: string }> {
  const res = await apiClient.post<{ detail: string }>('/auth/password/reset/', data);
  return res.data;
}

export async function resetPassword(data: ResetPasswordRequest): Promise<{ detail: string }> {
  const res = await apiClient.post<{ detail: string }>('/auth/password/reset/confirm/', data);
  return res.data;
}
