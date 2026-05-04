"""IoT device, NFC tag, and device-pairing models.

Everything in this app is intentionally self-contained — if IoT is removed
later, dropping this app cleanly takes these tables with it without touching
core finance models (Expense, Receipt, etc.).
"""

from django.conf import settings  # type: ignore
from django.db import models  # type: ignore
from django.utils import timezone  # type: ignore


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
        max_length=20,
        choices=DeviceType.choices,
    )
    device_id = models.CharField(
        max_length=100,
        unique=True,
        help_text="Hardware identifier",
    )
    api_key = models.CharField(
        max_length=255,
        unique=True,
        help_text="API key for device authentication",
    )
    api_key_expires_at = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    # -------------------------------------------------------------------------
    # IoT Receipt Scanner — last known LAN IP of the device
    # The firmware sends X-Device-IP on every poll request; PollView writes it
    # here so the web UI can build a direct snapshot URL for live preview.
    # Only meaningful on the same LAN — blank until first successful poll.
    # To remove: delete this field, run a migration, and remove from PollView +
    # IoTDeviceSerializer + the X-Device-IP httpJson() header in main.cpp.
    last_ip = models.CharField(
        max_length=45,
        blank=True,
        default="",
        help_text="Last reported LAN IP (IPv4 or IPv6). Populated by poll endpoint.",
    )
    # -------------------------------------------------------------------------
    # IoT Receipt Scanner — remote capture flag
    # Set to True by POST /api/v1/iot/devices/{id}/capture/ (web UI).
    # The ESP32-CAM firmware polls GET /api/v1/iot/poll/ and consumes this flag
    # (reads True → fires shutter → backend resets to False atomically).
    # Only meaningful for device_type="receipt_scanner"; ignored for nfc_logger.
    # To remove: delete this field, run a migration, remove the `capture` action
    # from IoTDeviceViewSet in views.py, and remove PollView from urls.py/ingest.py.
    pending_capture = models.BooleanField(default=False)
    # -------------------------------------------------------------------------
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


class DevicePairing(models.Model):
    """Short-lived pairing request that lets an un-owned ESP32 claim a user.

    Flow:
      1. Device boots with no API key, POSTs {hardware_id, device_type} to
         /iot/pair/request/ — we create a row here with a random 6-digit
         pairing_code, status="pending", expires in 10 minutes.
      2. Device polls /iot/pair/status/{code}/ every ~5 s while showing the
         code to the user (Serial + LED blink pattern).
      3. The user, while logged in to the web app, types the code into
         "Pair Device" and picks a name. That hits /iot/pair/claim/ which:
           - creates a real IoTDevice row owned by request.user,
           - generates a fresh api_key,
           - flips this row to status="claimed" and stores the FK.
      4. Device's next poll returns {status: "paired", api_key}, which it
         writes to ESP32 NVS (non-volatile storage) — persistent across
         reboots, wiped only by a long-press reset.

    Why a separate model instead of extra fields on IoTDevice:
      - IoTDevice should only exist once a user has claimed the hardware.
        Until then, the device is anonymous — putting "pending" rows in
        iot_devices would pollute every list/scoping query.
      - Lets us aggressively expire rows (cron/cleanup) without touching
        real devices.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"  # waiting for user to claim
        CLAIMED = "claimed", "Claimed"  # user claimed; device can pick up api_key
        EXPIRED = "expired", "Expired"  # hit the 10-min timeout
        CONSUMED = "consumed", "Consumed"  # device has retrieved its api_key

    # Anonymous while pending — set only on claim.
    device = models.OneToOneField(
        "iot.IoTDevice",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="pairing",
        help_text="Populated once the user claims this pairing.",
    )
    # Hardware identifier the device reports. We trust this only weakly:
    # the real identity check happens when the device authenticates with
    # its api_key on a later request.
    # Named `hardware_id` to avoid collision with the auto-generated `device_id`
    # FK column that Django creates for the OneToOne above.
    hardware_id = models.CharField(max_length=100)
    device_type = models.CharField(
        max_length=20,
        choices=IoTDevice.DeviceType.choices,
    )
    # 6-digit human-typable code. Unique across *active* pairings — enforced
    # in the view, not the DB, so expired codes can be re-issued.
    pairing_code = models.CharField(max_length=6, db_index=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    expires_at = models.DateTimeField(
        help_text="Pairing codes expire 10 minutes after creation.",
    )
    claimed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "iot_device_pairings"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["pairing_code", "status"]),
        ]

    def __str__(self):
        return f"Pairing {self.pairing_code} [{self.status}] {self.hardware_id}"

    def is_expired(self) -> bool:
        return timezone.now() >= self.expires_at
