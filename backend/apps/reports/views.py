"""Reports, dashboard, audit logs, currency, and export views."""
import csv
from decimal import Decimal

from django.db.models import Count, Sum # type: ignore
from django.db.models.functions import TruncMonth # type: ignore
from django.http import HttpResponse # type: ignore
from django_filters.rest_framework import DjangoFilterBackend # type: ignore
from rest_framework import mixins, viewsets # type: ignore
from rest_framework.filters import OrderingFilter # type: ignore
from rest_framework.permissions import IsAuthenticated # type: ignore
from rest_framework.response import Response # type: ignore
from rest_framework.views import APIView # type: ignore

from apps.budgets.models import Budget
from apps.expenses.models import Expense, Income
from apps.notifications.models import Notification

from .models import AuditLog, CurrencyRate
from .serializers import AuditLogSerializer, CurrencyConvertSerializer, CurrencyRateSerializer


# Dashboard

class DashboardView(APIView):
    """GET /api/v1/reports/dashboard/ — Aggregated dashboard summary."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        from django.utils import timezone # type: ignore
        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # Monthly totals
        total_expenses = (
            Expense.objects.filter(
                user=user, is_deleted=False, date__gte=month_start.date()
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0")
        )
        total_income = (
            Income.objects.filter(
                user=user, is_deleted=False, date__gte=month_start.date()
            ).aggregate(total=Sum("amount"))["total"]
            or Decimal("0")
        )

        balance = total_income - total_expenses
        savings_rate = (
            round(((total_income - total_expenses) / total_income) * 100, 1)
            if total_income > 0
            else Decimal("0")
        )

        # Budgets
        active_budgets = Budget.objects.filter(user=user, is_active=True).count()
        budgets_at_risk = Budget.objects.filter(
            user=user, is_active=True, alert_sent=True
        ).count()

        # Recent expenses
        recent_expenses = Expense.objects.filter(
            user=user, is_deleted=False
        ).select_related("category").order_by("-date", "-created_at")[:5]

        # Top categories this month
        top_categories = (
            Expense.objects.filter(
                user=user, is_deleted=False, date__gte=month_start.date()
            )
            .values("category__name", "category__color", "category__icon")
            .annotate(total=Sum("amount"))
            .order_by("-total")[:5]
        )

        # Unread counts
        unread_notifications = Notification.objects.filter(
            user=user, is_read=False
        ).count()

        from apps.ai_insights.models import AIInsight
        unread_insights = AIInsight.objects.filter(
            user=user, is_read=False, is_dismissed=False
        ).count()

        return Response({
            "total_balance": str(balance),
            "total_income_this_month": str(total_income),
            "total_expenses_this_month": str(total_expenses),
            "savings_rate": str(savings_rate),
            "active_budgets": active_budgets,
            "budgets_at_risk": budgets_at_risk,
            "recent_expenses": [
                {
                    "id": e.id,
                    "amount": str(e.amount),
                    "currency": e.currency,
                    "description": e.description,
                    "merchant": e.merchant,
                    "date": str(e.date),
                    "category_name": e.category.name if e.category else "Uncategorized",
                    "category_icon": e.category.icon if e.category else "circle-dot",
                    "category_color": e.category.color if e.category else "#94A3B8",
                }
                for e in recent_expenses
            ],
            "top_categories": [
                {
                    "name": item["category__name"] or "Uncategorized",
                    "color": item["category__color"] or "#94A3B8",
                    "icon": item["category__icon"] or "circle-dot",
                    "total": str(item["total"]),
                }
                for item in top_categories
            ],
            "unread_notifications": unread_notifications,
            "unread_insights": unread_insights,
        })


# Spending by Category

class SpendingByCategoryView(APIView):
    """GET /api/v1/reports/spending-by-category/"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Expense.objects.filter(user=request.user, is_deleted=False)

        # Optional date filters
        date_after = request.query_params.get("date_after")
        date_before = request.query_params.get("date_before")
        if date_after:
            qs = qs.filter(date__gte=date_after)
        if date_before:
            qs = qs.filter(date__lte=date_before)

        categories = (
            qs.values("category__id", "category__name", "category__color", "category__icon")
            .annotate(total=Sum("amount"), count=Count("id"))
            .order_by("-total")
        )

        return Response({
            "categories": [
                {
                    "category_id": item["category__id"],
                    "name": item["category__name"] or "Uncategorized",
                    "color": item["category__color"] or "#94A3B8",
                    "icon": item["category__icon"] or "circle-dot",
                    "total": str(item["total"]),
                    "count": item["count"],
                }
                for item in categories
            ]
        })


# Income vs Expense

class IncomeVsExpenseView(APIView):
    """GET /api/v1/reports/income-vs-expense/?months=6"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        months = int(request.query_params.get("months", 6))

        expense_by_month = dict(
            Expense.objects.filter(user=request.user, is_deleted=False)
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("-month")[:months]
            .values_list("month", "total")
        )

        income_by_month = dict(
            Income.objects.filter(user=request.user, is_deleted=False)
            .annotate(month=TruncMonth("date"))
            .values("month")
            .annotate(total=Sum("amount"))
            .order_by("-month")[:months]
            .values_list("month", "total")
        )

        # Merge all months
        all_months = sorted(
            set(list(expense_by_month.keys()) + list(income_by_month.keys())),
            reverse=True,
        )[:months]

        return Response({
            "monthly_data": [
                {
                    "month": m.strftime("%Y-%m"),
                    "income": str(income_by_month.get(m, 0)),
                    "expense": str(expense_by_month.get(m, 0)),
                    "net": str(
                        (income_by_month.get(m, Decimal("0")))
                        - (expense_by_month.get(m, Decimal("0")))
                    ),
                }
                for m in all_months
            ]
        })


# CSV Export

class ExportView(APIView):
    """GET /api/v1/reports/export/?type=expenses&date_from=&date_to="""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        export_type = request.query_params.get("type", "expenses")
        date_from = request.query_params.get("date_from")
        date_to = request.query_params.get("date_to")

        if export_type == "incomes":
            return self._export_incomes(request.user, date_from, date_to)
        return self._export_expenses(request.user, date_from, date_to)

    def _export_expenses(self, user, date_from, date_to):
        qs = Expense.objects.filter(user=user, is_deleted=False).select_related("category")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="expenses.csv"'

        writer = csv.writer(response)
        writer.writerow(["Date", "Amount", "Currency", "Category", "Merchant", "Description", "Source"])
        for e in qs.order_by("-date"):
            writer.writerow([
                e.date, e.amount, e.currency,
                e.category.name if e.category else "",
                e.merchant, e.description, e.source,
            ])

        # Log export
        AuditLog.objects.create(
            user=user, action="export", resource_type="expense",
            changes={"format": "csv", "date_from": date_from, "date_to": date_to},
        )
        return response

    def _export_incomes(self, user, date_from, date_to):
        qs = Income.objects.filter(user=user, is_deleted=False).select_related("category")
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="incomes.csv"'

        writer = csv.writer(response)
        writer.writerow(["Date", "Amount", "Currency", "Category", "Source Name", "Description"])
        for i in qs.order_by("-date"):
            writer.writerow([
                i.date, i.amount, i.currency,
                i.category.name if i.category else "",
                i.source_name, i.description,
            ])

        AuditLog.objects.create(
            user=user, action="export", resource_type="income",
            changes={"format": "csv", "date_from": date_from, "date_to": date_to},
        )
        return response


# Audit Logs

class AuditLogViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """Read-only audit trail for the current user."""

    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, OrderingFilter]
    filterset_fields = ["action", "resource_type"]
    ordering = ["-created_at"]

    def get_queryset(self):
        return AuditLog.objects.filter(user=self.request.user)


# Currency

class CurrencyRateListView(APIView):
    """GET /api/v1/reports/currency/rates/?base=NPR"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        base = request.query_params.get("base", "NPR")

        # Get latest rate for each target currency (database-agnostic)
        from django.db.models import Max, Subquery, OuterRef # type: ignore
        latest_ids = (
            CurrencyRate.objects.filter(base_currency=base)
            .values("target_currency")
            .annotate(latest_id=Max("id"))
            .values_list("latest_id", flat=True)
        )
        rates = CurrencyRate.objects.filter(id__in=latest_ids)

        return Response({
            "base": base,
            "rates": {r.target_currency: str(r.rate) for r in rates},
        })


class CurrencyConvertView(APIView):
    """GET /api/v1/reports/currency/convert/?source=USD&target=NPR&amount=100"""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        source = request.query_params.get("source", "USD")
        target = request.query_params.get("target", "NPR")
        try:
            amount = Decimal(request.query_params.get("amount", "0"))
        except Exception:
            return Response({"detail": "Invalid amount."}, status=400)

        rate_obj = (
            CurrencyRate.objects.filter(base_currency=source, target_currency=target)
            .order_by("-fetched_at")
            .first()
        )

        if not rate_obj:
            return Response(
                {"detail": f"No exchange rate found for {source} to {target}."},
                status=404,
            )

        converted = amount * rate_obj.rate

        return Response({
            "source": source,
            "target": target,
            "amount": str(amount),
            "converted": str(round(converted, 2)),
            "rate": str(rate_obj.rate),
            "rate_fetched_at": rate_obj.fetched_at,
        })
