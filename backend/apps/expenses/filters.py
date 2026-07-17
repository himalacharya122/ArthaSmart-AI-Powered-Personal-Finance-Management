"""Filter classes for expenses and incomes."""

import django_filters  # type: ignore

from .models import Expense, Income, RecurringTransaction


class ExpenseFilter(django_filters.FilterSet):
    """Filters for expense list endpoint."""

    date_after = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_before = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    min_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")

    class Meta:
        model = Expense
        fields = ["category", "source", "is_recurring", "merchant", "currency"]


class IncomeFilter(django_filters.FilterSet):
    """Filters for income list endpoint."""

    date_after = django_filters.DateFilter(field_name="date", lookup_expr="gte")
    date_before = django_filters.DateFilter(field_name="date", lookup_expr="lte")
    min_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="gte")
    max_amount = django_filters.NumberFilter(field_name="amount", lookup_expr="lte")

    class Meta:
        model = Income
        fields = ["category", "source_name", "is_recurring", "currency"]


class RecurringTransactionFilter(django_filters.FilterSet):
    """Filters for recurring transaction list endpoint."""

    class Meta:
        model = RecurringTransaction
        fields = ["type", "frequency", "is_active", "currency"]
