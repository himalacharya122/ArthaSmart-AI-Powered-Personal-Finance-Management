"""Report generation and audit logging models."""
from django.conf import settings # type: ignore
from django.db import models # type: ignore


class AuditLog(models.Model):
    """Audit trail for all user actions (security feature)."""

    class Action(models.TextChoices):
        CREATE = "create", "Create"
        UPDATE = "update", "Update"
        DELETE = "delete", "Delete"
        LOGIN = "login", "Login"
        LOGOUT = "logout", "Logout"
        EXPORT = "export", "Export"
        IMPORT = "import", "Import"
        FAILED_LOGIN = "failed_login", "Failed Login"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=Action.choices)
    resource_type = models.CharField(
        max_length=50,
        help_text="e.g., 'expense', 'budget', 'user'",
    )
    resource_id = models.BigIntegerField(null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    changes = models.JSONField(
        default=dict, blank=True,
        help_text="Before/after values for updates",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["resource_type", "resource_id"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        user_email = self.user.email if self.user else "System"
        return f"{user_email} | {self.action} {self.resource_type} #{self.resource_id}"


class CurrencyRate(models.Model):
    """Cached exchange rates for multi-currency support."""

    base_currency = models.CharField(max_length=3)
    target_currency = models.CharField(max_length=3)
    rate = models.DecimalField(max_digits=10, decimal_places=6)
    fetched_at = models.DateTimeField()

    class Meta:
        db_table = "currency_rates"
        indexes = [
            models.Index(fields=["base_currency", "target_currency", "fetched_at"]),
        ]

    def __str__(self):
        return f"{self.base_currency} → {self.target_currency}: {self.rate}"