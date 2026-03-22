import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  fetchUnreadCount,
  fetchPreferences,
  updatePreferences,
} from '@/api/notifications';
import type { NotificationPreference } from '@/types/notification';
import toast from 'react-hot-toast';

export function useNotifications(isRead?: boolean, type?: string) {
  return useQuery({
    queryKey: ['notifications', isRead, type],
    queryFn: () => fetchNotifications(isRead, type),
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: fetchUnreadCount,
    refetchInterval: 30_000,
  });
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success(`${data.updated} notifications marked as read`);
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      toast.success('Notification removed');
    },
    onError: () => toast.error('Failed to remove notification'),
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: fetchPreferences,
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (prefs: Omit<NotificationPreference, 'id'>[]) => updatePreferences(prefs),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notification-preferences'] });
      toast.success('Preferences saved');
    },
    onError: () => toast.error('Failed to save preferences'),
  });
}
