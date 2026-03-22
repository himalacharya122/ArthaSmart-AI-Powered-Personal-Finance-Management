import { useState } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Lightbulb,
  Clock,
  Monitor,
  TrendingUp,
  RotateCcw,
  Receipt,
  Settings,
} from 'lucide-react';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useNotificationPreferences,
  useUpdatePreferences,
} from '@/hooks/useNotifications';
import { PageHeader } from '@/components/common/PageHeader';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { EmptyState } from '@/components/common/EmptyState';
import { CardSkeleton } from '@/components/common/LoadingSkeleton';
import { Modal } from '@/components/common/Modal';
import { formatRelativeDate } from '@/utils/format';
import { cn } from '@/utils/cn';
import type { NotificationType, NotificationPreference } from '@/types/notification';

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; label: string; variant: 'danger' | 'warning' | 'info' | 'success' | 'neutral' }> = {
  budget_alert: { icon: AlertTriangle, label: 'Budget Alert', variant: 'danger' },
  insight: { icon: Lightbulb, label: 'Insight', variant: 'info' },
  reminder: { icon: Clock, label: 'Reminder', variant: 'warning' },
  system: { icon: Monitor, label: 'System', variant: 'neutral' },
  anomaly: { icon: TrendingUp, label: 'Anomaly', variant: 'danger' },
  recurring: { icon: RotateCcw, label: 'Recurring', variant: 'success' },
  receipt_processed: { icon: Receipt, label: 'Receipt', variant: 'success' },
};

export function NotificationsPage() {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [prefsOpen, setPrefsOpen] = useState(false);

  const isRead = filter === 'unread' ? false : undefined;
  const { data: notifications, isLoading } = useNotifications(isRead);
  const markRead = useMarkAsRead();
  const markAllRead = useMarkAllAsRead();
  const deleteMut = useDeleteNotification();
  const { data: preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const updatePrefs = useUpdatePreferences();

  const [localPrefs, setLocalPrefs] = useState<NotificationPreference[] | null>(null);

  function openPreferences() {
    setLocalPrefs(preferences ? [...preferences] : null);
    setPrefsOpen(true);
  }

  function togglePref(idx: number, field: keyof NotificationPreference) {
    if (!localPrefs) return;
    const updated = [...localPrefs];
    updated[idx] = { ...updated[idx], [field]: !updated[idx][field as keyof typeof updated[0]] };
    setLocalPrefs(updated);
  }

  function savePreferences() {
    if (!localPrefs) return;
    updatePrefs.mutate(
      localPrefs.map(({ notification_type, email_enabled, sms_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end }) => ({
        notification_type, email_enabled, sms_enabled, push_enabled, in_app_enabled, quiet_hours_start, quiet_hours_end,
      })),
      { onSuccess: () => setPrefsOpen(false) },
    );
  }

  const unreadCount = (notifications || []).filter((n) => !n.is_read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description="Stay updated on your finances"
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={openPreferences}>
              <Settings className="h-4 w-4" /> Preferences
            </Button>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                loading={markAllRead.isPending}
                onClick={() => markAllRead.mutate()}
              >
                <CheckCheck className="h-4 w-4" /> Mark all read
              </Button>
            )}
          </div>
        }
      />

      {/* Filter tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-primary-100 p-1 w-fit">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium transition-colors capitalize',
              filter === f ? 'bg-white text-primary-800 shadow-sm' : 'text-primary-500 hover:text-primary-700',
            )}
          >
            {f === 'unread' ? `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}` : 'All'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      ) : !notifications || notifications.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-12 w-12" />}
          title="No notifications"
          description={filter === 'unread' ? 'All caught up! No unread notifications.' : 'No notifications yet.'}
        />
      ) : (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const config = TYPE_CONFIG[notif.notification_type] || TYPE_CONFIG.system;
            const Icon = config.icon;
            return (
              <Card key={notif.id} padding="sm">
                <div className="flex items-start gap-3">
                  <div className={cn(
                    'mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg',
                    notif.is_read ? 'bg-primary-100 text-primary-400' : 'bg-accent-100 text-accent-600',
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className={cn('text-sm font-medium truncate', notif.is_read ? 'text-primary-500' : 'text-primary-800')}>
                        {notif.title}
                      </p>
                      <Badge variant={config.variant}>{config.label}</Badge>
                      {!notif.is_read && <span className="h-2 w-2 rounded-full bg-accent-500 flex-shrink-0" />}
                    </div>
                    <p className="text-sm text-primary-500 line-clamp-2">{notif.message}</p>
                    <p className="mt-1 text-xs text-primary-400">{formatRelativeDate(notif.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!notif.is_read && (
                      <button
                        onClick={() => markRead.mutate(notif.id)}
                        className="rounded p-1.5 text-primary-400 hover:bg-primary-100 hover:text-primary-600"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteMut.mutate(notif.id)}
                      className="rounded p-1.5 text-primary-400 hover:bg-danger-50 hover:text-danger-500"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Preferences modal */}
      <Modal open={prefsOpen} onClose={() => setPrefsOpen(false)} title="Notification Preferences" size="lg">
        {prefsLoading || !localPrefs ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-primary-100 text-left text-xs font-semibold uppercase text-primary-400">
                    <th className="pb-2 pr-4">Type</th>
                    <th className="pb-2 px-3 text-center">Email</th>
                    <th className="pb-2 px-3 text-center">Push</th>
                    <th className="pb-2 px-3 text-center">In-App</th>
                  </tr>
                </thead>
                <tbody>
                  {localPrefs.map((pref, idx) => {
                    const config = TYPE_CONFIG[pref.notification_type as NotificationType];
                    return (
                      <tr key={pref.notification_type} className="border-b border-primary-50 last:border-0">
                        <td className="py-3 pr-4 text-primary-700 capitalize">
                          {config?.label || pref.notification_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={pref.email_enabled}
                            onChange={() => togglePref(idx, 'email_enabled')}
                            className="h-4 w-4 rounded border-primary-300 text-accent-600 focus:ring-accent-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={pref.push_enabled}
                            onChange={() => togglePref(idx, 'push_enabled')}
                            className="h-4 w-4 rounded border-primary-300 text-accent-600 focus:ring-accent-500"
                          />
                        </td>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={pref.in_app_enabled}
                            onChange={() => togglePref(idx, 'in_app_enabled')}
                            className="h-4 w-4 rounded border-primary-300 text-accent-600 focus:ring-accent-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setPrefsOpen(false)}>Cancel</Button>
              <Button variant="accent" loading={updatePrefs.isPending} onClick={savePreferences}>
                Save Preferences
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
