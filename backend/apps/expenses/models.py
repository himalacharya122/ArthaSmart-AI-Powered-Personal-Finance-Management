"""Expense and Income models — the core financial records."""
from django.conf import settings # type: ignore
from django.db import models # type: ignore


class Expense(models.Model):
    """A single expense transaction."""

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual Entry"
        OCR = "ocr", "OCR Receipt Scan"
        NFC = "nfc", "NFC Tag"
        CHATBOT = "chatbot", "AI Chatbot"
        IMPORT = "import", "CSV/Data Import"

    class RecurringFrequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="NPR")
    amount_in_base = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="Amount converted to user's preferred currency",
    )
    exchange_rate = models.DecimalField(
        max_digits=10, decimal_places=6, null=True, blank=True,
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    description = models.TextField(blank=True)
    merchant = models.CharField(max_length=255, blank=True)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(
        max_length=20,
        choices=RecurringFrequency.choices,
        blank=True,
    )
    receipt_image = models.ImageField(
        upload_to="receipts/", blank=True, null=True,
    )
    ai_categorized = models.BooleanField(default=False)
    ai_confidence = models.FloatField(
        null=True, blank=True,
        help_text="AI confidence score between 0 and 1",
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )
    location = models.CharField(max_length=255, blank=True)
    tags = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "expenses"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "category"]),
            models.Index(fields=["user", "is_deleted", "date"]),
            models.Index(fields=["user", "source"]),
        ]

    def __str__(self):
        return f"{self.user.email} | {self.amount} {self.currency} | {self.date}"


class Income(models.Model):
    """A single income record."""

    class RecurringFrequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        MONTHLY = "monthly", "Monthly"
        YEARLY = "yearly", "Yearly"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="incomes",
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="NPR")
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="incomes",
    )
    source_name = models.CharField(
        max_length=255,
        help_text="e.g., 'TBC Salary', 'Freelance Project'",
    )
    description = models.TextField(blank=True)
    date = models.DateField()
    is_recurring = models.BooleanField(default=False)
    recurring_frequency = models.CharField(
        max_length=20,
        choices=RecurringFrequency.choices,
        blank=True,
    )
    metadata = models.JSONField(default=dict, blank=True)
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "incomes"
        ordering = ["-date", "-created_at"]
        indexes = [
            models.Index(fields=["user", "date"]),
            models.Index(fields=["user", "is_deleted", "date"]),
        ]

    def __str__(self):
        return f"{self.user.email} | +{self.amount} {self.currency} | {self.date}"