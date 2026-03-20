"""Serializers for IoT devices and NFC tags."""
from rest_framework import serializers # type: ignore

from apps.categories.models import Category
from apps.categories.serializers import CategoryMinimalSerializer

from .models import IoTDevice, NFCTag


class IoTDeviceSerializer(serializers.ModelSerializer):
    """IoT device CRUD serializer."""

    class Meta:
        model = IoTDevice
        fields = [
            "id", "name", "device_type", "device_id",
            "api_key", "api_key_expires_at",
            "is_active", "last_seen", "firmware_version",
            "metadata", "created_at",
        ]
        read_only_fields = ["id", "api_key", "api_key_expires_at", "last_seen", "created_at"]


class NFCTagSerializer(serializers.ModelSerializer):
    """NFC tag CRUD serializer."""

    category = CategoryMinimalSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True,
        required=False, allow_null=True,
    )

    class Meta:
        model = NFCTag
        fields = [
            "id", "tag_uid", "label", "category", "category_id",
            "default_amount", "default_currency",
            "merchant", "description", "tap_count",
            "is_active", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "tap_count", "created_at", "updated_at"]
