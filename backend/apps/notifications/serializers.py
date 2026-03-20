"""Serializers for notifications and preferences."""
from rest_framework import serializers # type: ignore

from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """Notification list/detail serializer."""

    class Meta:
        model = Notification
        fields = [
            "id", "title", "message", "notification_type", "channel",
            "is_read", "is_sent", "sent_at",
            "related_object_type", "related_object_id", "created_at",
        ]
        read_only_fields = fields


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """Notification preference for a specific notification type."""

    class Meta:
        model = NotificationPreference
        fields = [
            "id", "notification_type",
            "email_enabled", "sms_enabled", "push_enabled", "in_app_enabled",
            "quiet_hours_start", "quiet_hours_end",
        ]
        read_only_fields = ["id"]


class BulkNotificationPreferenceSerializer(serializers.Serializer):
    """Bulk update notification preferences."""

    preferences = NotificationPreferenceSerializer(many=True)
