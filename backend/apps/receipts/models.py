"""Receipt and OCR processing model."""

from django.conf import settings  # type: ignore
from django.db import models  # type: ignore


class Receipt(models.Model):
    """Uploaded receipt with OCR processing status and results."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PROCESSING = "processing", "Processing"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="receipts",
    )
    expense = models.ForeignKey(
        "expenses.Expense",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="receipts",
        help_text="Linked after OCR processing creates the expense",
    )
    image = models.ImageField(upload_to="receipts/images/")
    ocr_raw_text = models.TextField(blank=True)
    ocr_parsed_data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured data: {merchant, items[], total, date, currency}",
    )
    ocr_confidence = models.FloatField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    processing_time_ms = models.IntegerField(
        null=True,
        blank=True,
        help_text="How long OCR processing took in milliseconds",
    )
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "receipts"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "status"]),
            models.Index(fields=["user", "created_at"]),
        ]

    def __str__(self):
        return f"Receipt #{self.id} | {self.user.email} | {self.status}"
