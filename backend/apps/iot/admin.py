from django.contrib import admin  # type: ignore

from .models import IoTDevice, NFCTag


@admin.register(IoTDevice)
class IoTDeviceAdmin(admin.ModelAdmin):
    list_display = ("name", "device_type", "user", "is_active", "last_seen")
    list_filter = ("device_type", "is_active")
    search_fields = ("name", "device_id", "user__email")


@admin.register(NFCTag)
class NFCTagAdmin(admin.ModelAdmin):
    list_display = ("label", "user", "default_amount", "default_currency", "tap_count", "is_active")
    list_filter = ("is_active",)
    search_fields = ("label", "tag_uid", "user__email")
