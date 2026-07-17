"""Budget tracking model with alert thresholds."""

from django.conf import settings  # type: ignore
from django.db import models  # type: ignore


class Budget(models.Model):
    """A spending budget for a category or overall."""

    class Period(models.TextChoices):
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"
        CUSTOM = "custom", "Custom Date Range"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    name = models.CharField(max_length=255)
    amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Budget limit amount",
    )
    spent = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Current spent amount (cached, updated by signals/tasks)",
    )
    currency = models.CharField(max_length=3, default="NPR")
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="budgets",
        help_text="NULL means overall budget (all categories)",
    )
    period = models.CharField(
        max_length=20,
        choices=Period.choices,
        default=Period.MONTHLY,
    )
    start_date = models.DateField()
    end_date = models.DateField()
    alert_threshold = models.IntegerField(
        default=80,
        help_text="Alert when this percentage of budget is spent",
    )
    alert_sent = models.BooleanField(default=False)
    rollover = models.BooleanField(
        default=False,
        help_text="If TRUE, unused budget amount carries to next period",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "budgets"
        ordering = ["-start_date"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["user", "category", "start_date", "end_date"]),
        ]

    def __str__(self):
        return f"{self.name} | {self.spent}/{self.amount} {self.currency}"

    @property
    def percentage_used(self):
        """Return how much of the budget has been used as a percentage."""
        if self.amount == 0:
            return 0
        return round((self.spent / self.amount) * 100, 1)

    @property
    def is_over_budget(self):
        return self.spent > self.amount

    @property
    def remaining(self):
        return max(self.amount - self.spent, 0)
