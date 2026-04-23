"""Serializers for IoT devices and NFC tags."""

from rest_framework import serializers  # type: ignore

from apps.categories.models import Category
from apps.categories.serializers import CategoryMinimalSerializer

from .models import IoTDevice, NFCTag


class IoTDeviceSerializer(serializers.ModelSerializer):
    """IoT device CRUD serializer."""

    class Meta:
        model = IoTDevice
        fields = [
            "id",
            "name",
            "device_type",
            "device_id",
            "api_key",
            "api_key_expires_at",
            "is_active",
            "last_seen",
            "firmware_version",
            "metadata",
            "created_at",
        ]
        read_only_fields = ["id", "api_key", "api_key_expires_at", "last_seen", "created_at"]


class NFCTagSerializer(serializers.ModelSerializer):
    """NFC tag CRUD serializer."""

    category = CategoryMinimalSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = NFCTag
        fields = [
            "id",
            "tag_uid",
            "label",
            "category",
            "category_id",
            "default_amount",
            "default_currency",
            "merchant",
            "description",
            "tap_count",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "tap_count", "created_at", "updated_at"]


# Pairing flow payloads - see pairing.py for the endpoints that use these.
class PairingRequestSerializer(serializers.Serializer):
    """Incoming payload when a device POSTs /iot/pair/request/.

    `hardware_id` is whatever the firmware reports (we use the ESP32 MAC).
    We don't trust it as identity - it's just a display aid in the web UI.
    """

    hardware_id = serializers.CharField(max_length=100)
    device_type = serializers.ChoiceField(choices=IoTDevice.DeviceType.choices)


class PairingClaimSerializer(serializers.Serializer):
    """User-supplied payload when claiming a pending pairing code."""

    pairing_code = serializers.RegexField(
        regex=r"^\d{6}$",
        help_text="The 6-digit code displayed by the device.",
    )
    name = serializers.CharField(
        max_length=255,
        help_text="User-friendly name for the device, e.g. 'Kitchen Scanner'.",
    )


# Ingest payloads - what the ESP32 sends once it's authenticated.
class IngestReceiptSerializer(serializers.Serializer):
    """Multipart form: a single JPEG from the receipt scanner."""

    image = serializers.ImageField()


class IngestNFCTapSerializer(serializers.Serializer):
    """JSON body: the UID of the tag that was just tapped."""

    tag_uid = serializers.CharField(max_length=100)
