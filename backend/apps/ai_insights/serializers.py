"""Serializers for AI insights."""
from rest_framework import serializers # type: ignore

from .models import AIInsight


class AIInsightSerializer(serializers.ModelSerializer):
    """AI insight list/detail serializer."""

    class Meta:
        model = AIInsight
        fields = [
            "id", "insight_type", "title", "description", "data",
            "severity", "is_read", "is_dismissed",
            "generated_at", "expires_at",
        ]
        read_only_fields = fields
