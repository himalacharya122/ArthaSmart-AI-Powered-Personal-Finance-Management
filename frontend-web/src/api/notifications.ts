import apiClient from './client';
import type { Notification, NotificationPreference } from '@/types/notification';
import type { PaginatedResponse } from '@/types/api';

export async function fetchNotifications(
  isRead?: boolean,
  type?: string,
): Promise<Notification[]> {
  const params: Record<string, string> = { page_size: '100' };
  if (isRead !== undefined) params.is_read = String(isRead);
  if (type) params.notification_type = type;
  const res = await apiClient.get<PaginatedResponse<Notification>>('/notifications/', { params });
  return res.data.results;
}

export async function markAsRead(id: number): Promise<Notification> {
  const res = await apiClient.post<Notification>(`/notifications/${id}/read/`);
  return res.data;
}

export async function markAllAsRead(): Promise<{ updated: number }> {
  const res = await apiClient.post<{ updated: number }>('/notifications/read-all/');
  return res.data;
}

export async function deleteNotification(id: number): Promise<void> {
  await apiClient.delete(`/notifications/${id}/`);
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await apiClient.get<{ count: number }>('/notifications/unread-count/');
  return res.data.count;
}

export async function fetchPreferences(): Promise<NotificationPreference[]> {
  const res = await apiClient.get<{ preferences: NotificationPreference[] }>(
    '/notifications/preferences/',
  );
  return res.data.preferences;
}

export async function updatePreferences(
  preferences: Omit<NotificationPreference, 'id'>[],
): Promise<NotificationPreference[]> {
  const res = await apiClient.put<{ preferences: NotificationPreference[] }>(
    '/notifications/preferences/',
    { preferences },
  );
  return res.data.preferences;
}
