from django.contrib import admin # type: ignore

from .models import AIInsight


@admin.register(AIInsight)
class AIInsightAdmin(admin.ModelAdmin):
    list_display = ("title", "user", "insight_type", "severity", "is_read", "generated_at")
    list_filter = ("insight_type", "severity", "is_read", "is_dismissed")
    search_fields = ("title", "description", "user__email")
    ordering = ("-generated_at",)