from django.contrib import admin # type: ignore

from .models import Expense, Income


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "currency", "category", "date", "source", "ai_categorized")
    list_filter = ("source", "ai_categorized", "is_recurring", "currency", "is_deleted")
    search_fields = ("description", "merchant", "user__email")
    date_hierarchy = "date"
    ordering = ("-date",)


@admin.register(Income)
class IncomeAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "currency", "source_name", "date", "is_recurring")
    list_filter = ("is_recurring", "currency", "is_deleted")
    search_fields = ("source_name", "description", "user__email")
    date_hierarchy = "date"
    ordering = ("-date",)