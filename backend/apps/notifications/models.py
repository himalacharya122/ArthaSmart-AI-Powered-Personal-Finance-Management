"""User notification system for alerts and updates."""
from django.conf import settings # type: ignore
from django.db import models # type: ignore


class Notification(models.Model):
    """A notification sent to a user via various channels."""

    class NotificationType(models.TextChoices):
        BUDGET_ALERT = "budget_alert", "Budget Alert"
        INSIGHT = "insight", "AI Insight"
        REMINDER = "reminder", "Reminder"
        SYSTEM = "system", "System"
        ANOMALY = "anomaly", "Anomaly Alert"
        RECURRING = "recurring", "Recurring Transaction"
        RECEIPT_PROCESSED = "receipt_processed", "Receipt Processed"

    class Channel(models.TextChoices):
        IN_APP = "in_app", "In-App"
        EMAIL = "email", "Email"
        SMS = "sms", "SMS"
        PUSH = "push", "Push Notification"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(
        max_length=30, choices=NotificationType.choices,
    )
    channel = models.CharField(
        max_length=20,
        choices=Channel.choices,
        default=Channel.IN_APP,
    )
    is_read = models.BooleanField(default=False)
    is_sent = models.BooleanField(default=False)
    sent_at = models.DateTimeField(null=True, blank=True)
    related_object_type = models.CharField(
        max_length=50, blank=True,
        help_text="e.g., 'budget', 'expense', 'ai_insight'",
    )
    related_object_id = models.BigIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "created_at"]),
            models.Index(fields=["user", "notification_type"]),
        ]

    def __str__(self):
        return f"{self.title} | {self.user.email} | {self.channel}"
    
    
class NotificationPreference(models.Model):
    """Per-user notification channel preferences with quiet hours."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    notification_type = models.CharField(
        max_length=30,
        choices=Notification.NotificationType.choices,
    )
    email_enabled = models.BooleanField(default=True)
    sms_enabled = models.BooleanField(default=False)
    push_enabled = models.BooleanField(default=True)
    in_app_enabled = models.BooleanField(default=True)
    quiet_hours_start = models.TimeField(
        null=True, blank=True,
        help_text="No notifications sent after this time",
    )
    quiet_hours_end = models.TimeField(
        null=True, blank=True,
        help_text="Notifications resume at this time",
    )

    class Meta:
        db_table = "notification_preferences"
        unique_together = ["user", "notification_type"]

    def __str__(self):
        return f"{self.user.email} | {self.notification_type} prefs"