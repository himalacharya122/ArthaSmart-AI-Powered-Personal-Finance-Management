"""Serializers for budget management."""

from rest_framework import serializers  # type: ignore

from apps.categories.models import Category
from apps.categories.serializers import CategoryMinimalSerializer

from .models import Budget


class BudgetListSerializer(serializers.ModelSerializer):
    """Lightweight budget for list views with computed fields."""

    category = CategoryMinimalSerializer(read_only=True)
    percentage_used = serializers.FloatField(read_only=True)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_over_budget = serializers.BooleanField(read_only=True)

    class Meta:
        model = Budget
        fields = [
            "id",
            "name",
            "amount",
            "spent",
            "currency",
            "category",
            "period",
            "start_date",
            "end_date",
            "alert_threshold",
            "rollover",
            "is_active",
            "percentage_used",
            "remaining",
            "is_over_budget",
            "created_at",
        ]


class BudgetDetailSerializer(serializers.ModelSerializer):
    """Full budget for create/retrieve/update."""

    category = CategoryMinimalSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source="category",
        write_only=True,
        required=False,
        allow_null=True,
    )
    percentage_used = serializers.FloatField(read_only=True)
    remaining = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    is_over_budget = serializers.BooleanField(read_only=True)

    class Meta:
        model = Budget
        fields = [
            "id",
            "name",
            "amount",
            "spent",
            "currency",
            "category",
            "category_id",
            "period",
            "start_date",
            "end_date",
            "alert_threshold",
            "alert_sent",
            "rollover",
            "is_active",
            "percentage_used",
            "remaining",
            "is_over_budget",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "spent",
            "alert_sent",
            "created_at",
            "updated_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Budget amount must be greater than zero.")
        return value

    def validate(self, attrs):
        start = attrs.get("start_date", getattr(self.instance, "start_date", None))
        end = attrs.get("end_date", getattr(self.instance, "end_date", None))
        if start and end and start > end:
            raise serializers.ValidationError({"end_date": "End date must be after start date."})
        return attrs
