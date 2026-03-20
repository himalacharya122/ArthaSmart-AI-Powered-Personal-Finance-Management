"""Serializers for expenses, incomes, and recurring transactions."""
from rest_framework import serializers # type: ignore

from apps.categories.models import Category
from apps.categories.serializers import CategoryMinimalSerializer

from .models import Expense, Income, RecurringTransaction


# Expense

class ExpenseListSerializer(serializers.ModelSerializer):
    """Lightweight expense for list views."""

    category = CategoryMinimalSerializer(read_only=True)

    class Meta:
        model = Expense
        fields = [
            "id", "amount", "currency", "category",
            "description", "merchant", "date", "time",
            "source", "is_recurring", "created_at",
        ]


class ExpenseDetailSerializer(serializers.ModelSerializer):
    """Full expense for create/retrieve/update."""

    category = CategoryMinimalSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True,
        required=False, allow_null=True,
    )

    class Meta:
        model = Expense
        fields = [
            "id", "amount", "currency", "amount_in_base", "exchange_rate",
            "category", "category_id", "description", "merchant",
            "date", "time", "is_recurring", "recurring",
            "source", "location", "tags", "metadata",
            "ai_categorized", "ai_confidence",
            "is_deleted", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "is_deleted", "ai_categorized", "ai_confidence",
            "is_recurring", "recurring", "amount_in_base", "exchange_rate",
            "created_at", "updated_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value


# Income

class IncomeListSerializer(serializers.ModelSerializer):
    """Lightweight income for list views."""

    category = CategoryMinimalSerializer(read_only=True)

    class Meta:
        model = Income
        fields = [
            "id", "amount", "currency", "category",
            "source_name", "description", "date",
            "is_recurring", "created_at",
        ]


class IncomeDetailSerializer(serializers.ModelSerializer):
    """Full income for create/retrieve/update."""

    category = CategoryMinimalSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True,
        required=False, allow_null=True,
    )

    class Meta:
        model = Income
        fields = [
            "id", "amount", "currency", "category", "category_id",
            "source_name", "description", "date",
            "is_recurring", "recurring", "metadata",
            "is_deleted", "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "is_deleted", "is_recurring", "recurring",
            "created_at", "updated_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value


# Recurring Transaction

class RecurringTransactionSerializer(serializers.ModelSerializer):
    """Full serializer for recurring transaction CRUD."""

    category = CategoryMinimalSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True,
        required=False, allow_null=True,
    )

    class Meta:
        model = RecurringTransaction
        fields = [
            "id", "type", "amount", "currency",
            "category", "category_id",
            "description", "merchant", "source_name",
            "frequency", "day_of_week", "day_of_month", "month_of_year",
            "next_occurrence", "last_created_at", "total_created",
            "end_date", "is_active",
            "created_at", "updated_at",
        ]
        read_only_fields = [
            "id", "last_created_at", "total_created",
            "created_at", "updated_at",
        ]

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Amount must be greater than zero.")
        return value
