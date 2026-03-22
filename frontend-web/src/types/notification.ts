export type NotificationType =
  | 'budget_alert'
  | 'insight'
  | 'reminder'
  | 'system'
  | 'anomaly'
  | 'recurring'
  | 'receipt_processed';

export interface Notification {
  id: number;
  notification_type: NotificationType;
  title: string;
  message: string;
  channel: string;
  is_read: boolean;
  is_sent: boolean;
  sent_at: string | null;
  related_object_type: string;
  related_object_id: number | null;
  created_at: string;
}

export interface NotificationPreference {
  id: number;
  notification_type: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  push_enabled: boolean;
  in_app_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
}
