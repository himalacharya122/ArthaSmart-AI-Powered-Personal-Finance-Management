"""Custom User model for ArthaSmart."""
from django.contrib.auth.models import AbstractUser # type: ignore
from django.db import models # type: ignore


class User(AbstractUser):
    """Extended user model with financial profile fields."""

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    preferred_currency = models.CharField(max_length=3, default="NPR")
    monthly_income_goal = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text="User's target monthly income for budgeting",
    )
    profile_picture = models.ImageField(
        upload_to="profiles/", blank=True, null=True,
    )
    timezone = models.CharField(
        max_length=50, default="Asia/Kathmandu",
        help_text="IANA timezone for recurring transaction scheduling",
    )
    is_email_verified = models.BooleanField(default=False)
    two_factor_enabled = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "user"
        verbose_name_plural = "users"

    def __str__(self):
        return self.email