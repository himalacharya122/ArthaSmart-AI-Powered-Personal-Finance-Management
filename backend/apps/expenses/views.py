"""Views for expenses, incomes, and recurring transactions."""
from django.db.models import Sum # type: ignore
from django.db.models.functions import TruncMonth # type: ignore
from django_filters.rest_framework import DjangoFilterBackend # type: ignore
from rest_framework import viewsets # type: ignore
from rest_framework.decorators import action # type: ignore
from rest_framework.filters import OrderingFilter, SearchFilter # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore

from apps.shared.permissions import IsOwner

from .filters import ExpenseFilter, IncomeFilter, RecurringTransactionFilter
from .models import Expense, Income, RecurringTransaction
from .serializers import (
    ExpenseDetailSerializer,
    ExpenseListSerializer,
    IncomeDetailSerializer,
    IncomeListSerializer,
    RecurringTransactionSerializer,
)


# Expenses

class ExpenseViewSet(viewsets.ModelViewSet):
    """CRUD for expenses with soft delete, filtering, and summary."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = ExpenseFilter
    search_fields = ["description", "merchant"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def get_queryset(self):
        return Expense.objects.filter(
            user=self.request.user,
            is_deleted=False,
        ).select_related("category")

    def get_serializer_class(self):
        if self.action == "list":
            return ExpenseListSerializer
        return ExpenseDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, source="manual")

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """GET /api/v1/expenses/summary/ — Spending totals by category and month."""
        qs = self.filter_queryset(self.get_queryset())

        total = qs.aggregate(total=Sum("amount"))["total"] or 0

        by_category = (
            qs.values("category__id", "category__name", "category__color", "category__icon")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )

        by_month = (
            qs.annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("-month")[:12]
        )

        return Response({
            "total": str(total),
            "by_category": [
                {
                    "category_id": item["category__id"],
                    "name": item["category__name"] or "Uncategorized",
                    "color": item["category__color"] or "#94A3B8",
                    "icon": item["category__icon"] or "circle-dot",
                    "total": str(item["total"]),
                }
                for item in by_category
            ],
            "by_month": [
                {
                    "month": item["month"].strftime("%Y-%m"),
                    "total": str(item["total"]),
                }
                for item in by_month
            ],
        })


# Incomes

class IncomeViewSet(viewsets.ModelViewSet):
    """CRUD for incomes with soft delete, filtering, and summary."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_class = IncomeFilter
    search_fields = ["source_name", "description"]
    ordering_fields = ["date", "amount", "created_at"]
    ordering = ["-date"]

    def get_queryset(self):
        return Income.objects.filter(
            user=self.request.user,
            is_deleted=False,
        ).select_related("category")

    def get_serializer_class(self):
        if self.action == "list":
            return IncomeListSerializer
        return IncomeDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_destroy(self, instance):
        instance.is_deleted = True
        instance.save(update_fields=["is_deleted"])

    @action(detail=False, methods=["get"])
    def summary(self, request):
        """GET /api/v1/incomes/summary/ — Income totals by source and month."""
        qs = self.filter_queryset(self.get_queryset())

        total = qs.aggregate(total=Sum("amount"))["total"] or 0

        by_source = (
            qs.values("source_name")
            .annotate(total=Sum("amount"))
            .order_by("-total")
        )

        by_month = (
            qs.annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("-month")[:12]
        )

        return Response({
            "total": str(total),
            "by_source": [
                {"source_name": item["source_name"], "total": str(item["total"])}
                for item in by_source
            ],
            "by_month": [
                {
                    "month": item["month"].strftime("%Y-%m"),
                    "total": str(item["total"]),
                }
                for item in by_month
            ],
        })


# Recurring Transactions

class RecurringTransactionViewSet(viewsets.ModelViewSet):
    """CRUD for recurring transaction rules with pause/resume."""

    serializer_class = RecurringTransactionSerializer
    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_class = RecurringTransactionFilter
    ordering_fields = ["next_occurrence", "amount", "created_at"]
    ordering = ["next_occurrence"]

    def get_queryset(self):
        return RecurringTransaction.objects.filter(
            user=self.request.user,
        ).select_related("category")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def pause(self, request, pk=None):
        """POST /api/v1/recurring-transactions/{id}/pause/"""
        instance = self.get_object()
        instance.is_active = False
        instance.save(update_fields=["is_active"])
        return Response({"is_active": False})

    @action(detail=True, methods=["post"])
    def resume(self, request, pk=None):
        """POST /api/v1/recurring-transactions/{id}/resume/"""
        instance = self.get_object()
        instance.is_active = True
        instance.save(update_fields=["is_active"])
        serializer = self.get_serializer(instance)
        return Response(serializer.data)
