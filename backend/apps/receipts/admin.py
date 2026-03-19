from django.contrib import admin # type: ignore

from .models import Receipt


@admin.register(Receipt)
class ReceiptAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "status", "ocr_confidence", "processing_time_ms", "created_at")
    list_filter = ("status",)
    search_fields = ("user__email", "ocr_raw_text")
    ordering = ("-created_at",)