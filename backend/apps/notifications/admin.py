from django.contrib import admin # type: ignore

from .models import Notification, NotificationPreference


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "notification_type", "channel", "is_read", "is_sent", "created_at")
    list_filter = ("notification_type", "channel", "is_read", "is_sent")
    search_fields = ("title", "message", "user__email")
    ordering = ("-created_at",)


@admin.register(NotificationPreference)
class NotificationPreferenceAdmin(admin.ModelAdmin):
    list_display = ("user", "notification_type", "email_enabled", "sms_enabled", "push_enabled", "in_app_enabled")
    list_filter = ("notification_type",)
    search_fields = ("user__email",)