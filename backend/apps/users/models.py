"""Custom User model for Squirrel."""

import secrets
import string

from django.contrib.auth.models import AbstractUser  # type: ignore
from django.db import models  # type: ignore
from django.utils import timezone  # type: ignore


class User(AbstractUser):
    """Extended user model with financial profile fields."""

    email = models.EmailField(unique=True)
    phone_number = models.CharField(max_length=20, blank=True)
    preferred_currency = models.CharField(max_length=3, default="NPR")
    monthly_income_goal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="User's target monthly income for budgeting",
    )
    profile_picture = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True,
    )
    timezone = models.CharField(
        max_length=50,
        default="Asia/Kathmandu",
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


class EmailVerification(models.Model):
    """Stores 6-digit verification codes sent via email after registration."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_verifications")
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = "email_verifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} — {self.code}"

    @property
    def is_expired(self):
        return timezone.now() > self.expires_at

    @classmethod
    def generate_code(cls):
        """Generate a random 6-digit code."""
        return "".join(secrets.choice(string.digits) for _ in range(6))

    @classmethod
    def create_for_user(cls, user):
        """Create a new verification code for a user, invalidating old ones."""
        cls.objects.filter(user=user, is_used=False).update(is_used=True)
        code = cls.generate_code()
        return cls.objects.create(
            user=user,
            code=code,
            expires_at=timezone.now() + timezone.timedelta(minutes=15),
        )
