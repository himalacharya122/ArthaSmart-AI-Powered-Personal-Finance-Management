"""IoT device and NFC tag models."""
from django.conf import settings # type: ignore
from django.db import models # type: ignore


class IoTDevice(models.Model):
    """Registered IoT device (receipt scanner or NFC logger)."""

    class DeviceType(models.TextChoices):
        RECEIPT_SCANNER = "receipt_scanner", "Receipt Scanner"
        NFC_LOGGER = "nfc_logger", "NFC Expense Logger"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="iot_devices",
    )
    name = models.CharField(
        max_length=255,
        help_text="User-friendly name, e.g., 'Kitchen Scanner'",
    )
    device_type = models.CharField(
        max_length=20, choices=DeviceType.choices,
    )
    device_id = models.CharField(
        max_length=100, unique=True,
        help_text="Hardware identifier",
    )
    api_key = models.CharField(
        max_length=255, unique=True,
        help_text="API key for device authentication",
    )
    api_key_expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    firmware_version = models.CharField(max_length=50, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "iot_devices"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "device_type"]),
        ]

    def __str__(self):
        return f"{self.name} ({self.device_type}) | {self.user.email}"


class NFCTag(models.Model):
    """Pre-configured NFC tag mapped to a specific expense."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="nfc_tags",
    )
    tag_uid = models.CharField(max_length=100)
    label = models.CharField(
        max_length=255,
        help_text="User-friendly label, e.g., 'Morning Coffee'",
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="nfc_tags",
    )
    default_amount = models.DecimalField(max_digits=12, decimal_places=2)
    default_currency = models.CharField(max_length=3, default="NPR")
    merchant = models.CharField(max_length=255, blank=True)
    description = models.TextField(blank=True)
    tap_count = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "nfc_tags"
        unique_together = ["user", "tag_uid"]
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.label} | {self.default_amount} {self.default_currency}"