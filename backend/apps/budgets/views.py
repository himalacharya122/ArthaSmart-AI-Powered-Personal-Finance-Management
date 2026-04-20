"""Budget management views."""

from django.db.models import Sum  # type: ignore
from django_filters.rest_framework import DjangoFilterBackend  # type: ignore
from rest_framework import viewsets  # type: ignore
from rest_framework.decorators import action  # type: ignore
from rest_framework.filters import OrderingFilter, SearchFilter  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore

from apps.expenses.models import Expense
from apps.shared.permissions import IsOwner

from .models import Budget
from .serializers import BudgetDetailSerializer, BudgetListSerializer


class BudgetViewSet(viewsets.ModelViewSet):
    """CRUD for budgets with spent calculation and alert checking."""

    permission_classes = [IsAuthenticated, IsOwner]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ["is_active", "category", "period"]
    search_fields = ["name"]
    ordering_fields = ["created_at", "start_date", "end_date", "amount"]
    ordering = ["-start_date"]

    def get_queryset(self):
        return Budget.objects.filter(
            user=self.request.user,
        ).select_related("category")

    def get_serializer_class(self):
        if self.action == "list":
            return BudgetListSerializer
        return BudgetDetailSerializer

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def _recalculate_spent(self, budget):
        """Recalculate the spent amount from actual expenses."""
        filters = {
            "user": budget.user,
            "is_deleted": False,
            "date__gte": budget.start_date,
            "date__lte": budget.end_date,
        }
        if budget.category:
            filters["category"] = budget.category

        total = Expense.objects.filter(**filters).aggregate(total=Sum("amount"))["total"] or 0

        budget.spent = total
        budget.save(update_fields=["spent"])
        return budget

    def retrieve(self, request, *args, **kwargs):
        """Recalculate spent on each detail view for accuracy."""
        instance = self.get_object()
        instance = self._recalculate_spent(instance)
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="check-alerts")
    def check_alerts(self, request, pk=None):
        """POST /api/v1/budgets/{id}/check-alerts/ — Manually check if alert should trigger."""
        budget = self.get_object()
        budget = self._recalculate_spent(budget)

        alert_triggered = False
        if budget.percentage_used >= budget.alert_threshold and not budget.alert_sent:
            budget.alert_sent = True
            budget.save(update_fields=["alert_sent"])
            alert_triggered = True

        return Response(
            {
                "alert_triggered": alert_triggered,
                "percentage_used": budget.percentage_used,
                "spent": str(budget.spent),
                "amount": str(budget.amount),
                "remaining": str(budget.remaining),
            }
        )
