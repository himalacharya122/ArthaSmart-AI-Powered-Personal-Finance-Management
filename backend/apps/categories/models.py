"""Category model for expense and income classification."""
from django.conf import settings # type: ignore
from django.db import models # type: ignore
from django.utils.text import slugify # type: ignore


class Category(models.Model):
    """Expense or income category. Can be system default or user-created."""

    class CategoryType(models.TextChoices):
        EXPENSE = "expense", "Expense"
        INCOME = "income", "Income"

    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100)
    icon = models.CharField(
        max_length=50, blank=True,
        help_text="Lucide icon name (e.g., 'utensils', 'car')",
    )
    color = models.CharField(max_length=7, default="#6366F1")
    type = models.CharField(
        max_length=10,
        choices=CategoryType.choices,
        default=CategoryType.EXPENSE,
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories",
        help_text="NULL means system default category",
    )
    is_default = models.BooleanField(
        default=False,
        help_text="True for system-provided categories",
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "categories"
        verbose_name_plural = "categories"
        unique_together = ["user", "slug", "type"]
        ordering = ["name"]

    def __str__(self):
        prefix = "System" if self.is_default else f"User:{self.user_id}"
        return f"[{prefix}] {self.name} ({self.type})"

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)