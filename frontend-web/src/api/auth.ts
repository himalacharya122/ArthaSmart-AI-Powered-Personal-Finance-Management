import apiClient from './client';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  PasswordChangeRequest,
  ProfileUpdateRequest,
  User,
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
