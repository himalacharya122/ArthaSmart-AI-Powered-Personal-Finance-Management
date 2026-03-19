from django.contrib import admin # type: ignore

from .models import AuditLog, CurrencyRate


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("user", "action", "resource_type", "resource_id", "ip_address", "created_at")
    list_filter = ("action", "resource_type")
    search_fields = ("user__email", "resource_type")
    ordering = ("-created_at",)
    readonly_fields = ("user", "action", "resource_type", "resource_id", "ip_address", "user_agent", "changes", "created_at")


@admin.register(CurrencyRate)
class CurrencyRateAdmin(admin.ModelAdmin):
    list_display = ("base_currency", "target_currency", "rate", "fetched_at")
    list_filter = ("base_currency", "target_currency")
    ordering = ("-fetched_at",)