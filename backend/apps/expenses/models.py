"""Expense and Income models — the core financial records."""

from django.conf import settings  # type: ignore
from django.db import models  # type: ignore


class RecurringTransaction(models.Model):
    """Recurring rule that auto-creates expenses or incomes via Celery Beat."""

    class TransactionType(models.TextChoices):
        EXPENSE = "expense", "Expense"
        INCOME = "income", "Income"

    class Frequency(models.TextChoices):
        DAILY = "daily", "Daily"
        WEEKLY = "weekly", "Weekly"
        BIWEEKLY = "biweekly", "Biweekly"
        MONTHLY = "monthly", "Monthly"
        QUARTERLY = "quarterly", "Quarterly"
        YEARLY = "yearly", "Yearly"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="recurring_transactions",
    )
    type = models.CharField(max_length=10, choices=TransactionType.choices)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default="NPR")
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_transactions",
    )
    description = models.TextField(blank=True)
    merchant = models.CharField(
        max_length=255,
        blank=True,
        help_text="For expense type only",
    )
    source_name = models.CharField(
        max_length=255,
        blank=True,
        help_text="For income type only (e.g., 'TBC Salary')",
    )
    frequency = models.CharField(max_length=20, choices=Frequency.choices)
    day_of_week = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="0=Monday to 6=Sunday (for weekly/biweekly)",
    )
    day_of_month = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="1-31 (for monthly, wraps to last day if needed)",
    )
    month_of_year = models.SmallIntegerField(
        null=True,
        blank=True,
        help_text="1-12 (for yearly)",
    )
    next_occurrence = models.DateField(
        help_text="When to auto-create the next transaction",
    )
    last_created_at = models.DateTimeField(null=True, blank=True)
    total_created = models.IntegerField(default=0)
    end_date = models.DateField(
        null=True,
        blank=True,
        help_text="NULL = runs forever",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "recurring_transactions"
        ordering = ["next_occurrence"]
        indexes = [
            models.Index(fields=["user", "is_active"]),
            models.Index(fields=["is_active", "next_occurrence"]),
        ]

    def __str__(self):
        return f"{self.type} | {self.amount} {self.currency} | {self.frequency} | Next: {self.next_occurrence}"


class Expense(models.Model):
    """A single expense transaction."""

    class PaymentMethod(models.TextChoices):
        CARD = "card", "Card"
        CASH = "cash", "Cash"
        WALLET = "wallet", "Wallet"
        BANK = "bank", "Bank Transfer"

    class Source(models.TextChoices):
        MANUAL = "manual", "Manual Entry"
        OCR = "ocr", "OCR Receipt Scan"
        NFC = "nfc", "NFC Tag"
        CHATBOT = "chatbot", "AI Chatbot"
        IMPORT = "import", "CSV/Data Import"
        RECURRING = "recurring", "Auto-Created by Recurring Rule"

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
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Amount converted to user's preferred currency",
    )
    exchange_rate = models.DecimalField(
        max_digits=10,
        decimal_places=6,
        null=True,
        blank=True,
    )
    category = models.ForeignKey(
        "categories.Category",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )
    description = models.TextField(blank=True)
    notes = models.TextField(
        blank=True,
        help_text="User-authored free-text notes (separate from description).",
    )
    merchant = models.CharField(max_length=255, blank=True)
    date = models.DateField()
    time = models.TimeField(null=True, blank=True)
    is_recurring = models.BooleanField(
        default=False,
        help_text="TRUE if auto-created by a recurring rule",
    )
    recurring = models.ForeignKey(
        "expenses.RecurringTransaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_expenses",
        help_text="The recurring rule that created this expense",
    )
    receipt_image = models.ImageField(
        upload_to="receipts/",
        blank=True,
        null=True,
    )
    ai_categorized = models.BooleanField(default=False)
    ai_confidence = models.FloatField(
        null=True,
        blank=True,
        help_text="AI confidence score between 0 and 1",
    )
    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.MANUAL,
    )
    payment_method = models.CharField(
        max_length=20,
        choices=PaymentMethod.choices,
        blank=True,
        default="",
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
    notes = models.TextField(
        blank=True,
        help_text="User-authored free-text notes (separate from description).",
    )
    date = models.DateField()
    is_recurring = models.BooleanField(default=False)
    recurring = models.ForeignKey(
        "expenses.RecurringTransaction",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_incomes",
        help_text="The recurring rule that created this income",
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
