from django.contrib import admin # type: ignore

from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "notification_type", "channel", "is_read", "is_sent", "created_at")
    list_filter = ("notification_type", "channel", "is_read", "is_sent")
    search_fields = ("title", "message", "user__email")
    ordering = ("-created_at",)