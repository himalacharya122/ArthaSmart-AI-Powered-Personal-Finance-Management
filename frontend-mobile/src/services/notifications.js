/**
 * Notifications API service.
 *
 * Backend endpoints:
 *   GET    /api/v1/notifications/              — List (filterable: is_read, notification_type)
 *   GET    /api/v1/notifications/:id/          — Detail
 *   DELETE /api/v1/notifications/:id/          — Delete
 *   GET    /api/v1/notifications/unread-count/ — Unread count
 *   POST   /api/v1/notifications/:id/read/     — Mark one as read
 *   POST   /api/v1/notifications/read-all/     — Mark all as read
 *   GET    /api/v1/notifications/preferences/  — Get preferences
 *   PUT    /api/v1/notifications/preferences/  — Update preferences (bulk)
 */
import api from './api';

const BASE = '/api/v1/notifications';

/* Notifications */

export async function getNotifications(params = {}) {
  const { data } = await api.get(`${BASE}/`, { params });
  return data;
}

export async function getNotification(id) {
  const { data } = await api.get(`${BASE}/${id}/`);
  return data;
}

export async function deleteNotification(id) {
  await api.delete(`${BASE}/${id}/`);
}

export async function getUnreadCount() {
  const { data } = await api.get(`${BASE}/unread-count/`);
  return data;
}

export async function markAsRead(id) {
  const { data } = await api.post(`${BASE}/${id}/read/`);
  return data;
}

export async function markAllAsRead() {
  const { data } = await api.post(`${BASE}/read-all/`);
  return data;
}

/* Preferences */

export async function getPreferences() {
  const { data } = await api.get(`${BASE}/preferences/`);
  return data;
}

export async function updatePreferences(preferences) {
  const { data } = await api.put(`${BASE}/preferences/`, { preferences });
  return data;
}
