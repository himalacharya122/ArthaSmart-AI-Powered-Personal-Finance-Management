from django.contrib import admin  # type: ignore

from .models import DevicePairing, IoTDevice, NFCTag


@admin.register(IoTDevice)
class IoTDeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "device_type", "user", "is_active", "last_seen")
    list_filter = ("device_type", "is_active")
    search_fields = ("name", "device_id", "user__email")


@admin.register(DevicePairing)
class DevicePairingAdmin(admin.ModelAdmin):
    list_display = (
        "pairing_code",
        "hardware_id",
        "device_type",
        "status",
        "created_at",
        "expires_at",
    )
    list_filter = ("status", "device_type")
    search_fields = ("pairing_code", "hardware_id")
    readonly_fields = (
        "pairing_code",
        "hardware_id",
        "device_type",
        "status",
        "expires_at",
        "claimed_at",
        "created_at",
        "device",
    )


@admin.register(NFCTag)
class NFCTagAdmin(admin.ModelAdmin):
    list_display = ("label", "user", "default_amount", "default_currency", "tap_count", "is_active")
    list_filter = ("is_active",)
    search_fields = ("label", "tag_uid", "user__email")
