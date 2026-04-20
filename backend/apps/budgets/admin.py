from django.contrib import admin  # type: ignore

from .models import Budget


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "amount", "spent", "percentage_used", "period", "is_active")
    list_filter = ("period", "is_active", "alert_sent")
    search_fields = ("name", "user__email")
    ordering = ("-start_date",)
