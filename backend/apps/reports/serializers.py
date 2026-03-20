"""Serializers for reports, audit logs, and currency rates."""
from rest_framework import serializers # type: ignore

from .models import AuditLog, CurrencyRate


class AuditLogSerializer(serializers.ModelSerializer):
    """Read-only audit log entries."""

    class Meta:
        model = AuditLog
        fields = [
            "id", "action", "resource_type", "resource_id",
            "ip_address", "user_agent", "changes", "created_at",
        ]
        read_only_fields = fields


class CurrencyRateSerializer(serializers.ModelSerializer):
    """Currency exchange rate."""

    class Meta:
        model = CurrencyRate
        fields = ["id", "base_currency", "target_currency", "rate", "fetched_at"]
        read_only_fields = fields


class CurrencyConvertSerializer(serializers.Serializer):
    """Request to convert an amount between currencies."""

    amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    # from/to are reserved, use source/target
    source = serializers.CharField(max_length=3, help_text="e.g. USD")
    target = serializers.CharField(max_length=3, help_text="e.g. NPR")
