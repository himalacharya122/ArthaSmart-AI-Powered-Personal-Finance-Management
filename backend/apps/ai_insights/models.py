"""AI-generated insights and analytics results."""

from django.conf import settings  # type: ignore
from django.db import models  # type: ignore


class AIInsight(models.Model):
    """An AI-generated financial insight for a user."""

    class InsightType(models.TextChoices):
        SPENDING_PATTERN = "spending_pattern", "Spending Pattern"
        ANOMALY = "anomaly", "Anomaly Detection"
        PREDICTION = "prediction", "Budget Prediction"
        SUGGESTION = "suggestion", "Financial Suggestion"

    class Severity(models.TextChoices):
        INFO = "info", "Info"
        WARNING = "warning", "Warning"
        CRITICAL = "critical", "Critical"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="ai_insights",
    )
    insight_type = models.CharField(
        max_length=50,
        choices=InsightType.choices,
    )
    title = models.CharField(max_length=255)
    description = models.TextField()
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Chart data, numbers, supporting evidence",
    )
    severity = models.CharField(
        max_length=20,
        choices=Severity.choices,
        default=Severity.INFO,
    )
    is_read = models.BooleanField(default=False)
    is_dismissed = models.BooleanField(default=False)
    generated_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "ai_insights"
        ordering = ["-generated_at"]
        indexes = [
            models.Index(fields=["user", "is_read", "generated_at"]),
            models.Index(fields=["user", "insight_type"]),
        ]

    def __str__(self):
        return f"[{self.severity}] {self.title} | {self.user.email}"
