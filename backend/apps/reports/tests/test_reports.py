"""Dashboard, spending-by-category, income-vs-expense, export, audit logs, currency."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest  # type: ignore
from django.urls import reverse  # type: ignore
from django.utils import timezone  # type: ignore

from apps.reports.models import AuditLog, CurrencyRate

pytestmark = pytest.mark.django_db

DASHBOARD_URL = reverse("reports:dashboard")
SPENDING_URL = reverse("reports:spending-by-category")
IVE_URL = reverse("reports:income-vs-expense")
EXPORT_URL = reverse("reports:export")
RATES_URL = reverse("reports:currency-rates")
CONVERT_URL = reverse("reports:currency-convert")
AUDIT_LIST = reverse("reports:audit-log-list")


class TestDashboard:
    def test_empty_user_safe_defaults(self, authenticated_client):
        r = authenticated_client.get(DASHBOARD_URL)
        assert r.status_code == 200
        assert Decimal(r.data["total_expenses_this_month"]) == 0
        assert Decimal(r.data["total_income_this_month"]) == 0
        assert Decimal(r.data["savings_rate"]) == 0
        assert r.data["recent_expenses"] == []

    def test_aggregates_month(self, authenticated_client, user, expense_factory, income_factory):
        today = date.today().replace(day=15)
        expense_factory(user=user, amount=Decimal("300"), date=today)
        income_factory(user=user, amount=Decimal("1000"), date=today)
        r = authenticated_client.get(DASHBOARD_URL)
        assert Decimal(r.data["total_income_this_month"]) == Decimal("1000")
        assert Decimal(r.data["total_expenses_this_month"]) == Decimal("300")
        assert Decimal(r.data["total_balance"]) == Decimal("700")
        assert Decimal(r.data["savings_rate"]) == Decimal("70.0")

    def test_recent_expenses_and_top_categories(
        self, authenticated_client, user, expense_factory, category_factory
    ):
        cat = category_factory(user=user, name="Food")
        today = date.today().replace(day=15)
        expense_factory(user=user, category=cat, amount=Decimal("50"), date=today)
        expense_factory(user=user, category=cat, amount=Decimal("30"), date=today)
        r = authenticated_client.get(DASHBOARD_URL)
        assert len(r.data["recent_expenses"]) == 2
        assert r.data["top_categories"][0]["name"] == "Food"
        assert Decimal(r.data["top_categories"][0]["total"]) == Decimal("80")

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(DASHBOARD_URL).status_code == 401


class TestSpendingByCategory:
    def test_groups_by_category(
        self, authenticated_client, user, expense_factory, category_factory
    ):
        food = category_factory(user=user, name="Food")
        transport = category_factory(user=user, name="Transport")
        expense_factory(user=user, category=food, amount=Decimal("100"))
        expense_factory(user=user, category=food, amount=Decimal("50"))
        expense_factory(user=user, category=transport, amount=Decimal("30"))
        r = authenticated_client.get(SPENDING_URL)
        by_name = {c["name"]: c for c in r.data["categories"]}
        assert Decimal(by_name["Food"]["total"]) == Decimal("150")
        assert by_name["Food"]["count"] == 2
        assert Decimal(by_name["Transport"]["total"]) == Decimal("30")

    def test_uncategorized_fallback(self, authenticated_client, user, expense_factory):
        expense_factory(user=user, category=None, amount=Decimal("20"))
        r = authenticated_client.get(SPENDING_URL)
        assert r.data["categories"][0]["name"] == "Uncategorized"

    def test_date_filters(self, authenticated_client, user, expense_factory, category_factory):
        cat = category_factory(user=user)
        today = date.today()
        expense_factory(user=user, category=cat, amount=Decimal("100"), date=today)
        expense_factory(
            user=user,
            category=cat,
            amount=Decimal("999"),
            date=today - timedelta(days=365),
        )
        r = authenticated_client.get(
            SPENDING_URL,
            {"date_after": str(today - timedelta(days=30))},
        )
        assert Decimal(r.data["categories"][0]["total"]) == Decimal("100")


class TestIncomeVsExpense:
    def test_merges_months(self, authenticated_client, user, expense_factory, income_factory):
        today = date.today().replace(day=15)
        expense_factory(user=user, amount=Decimal("100"), date=today)
        income_factory(user=user, amount=Decimal("500"), date=today)
        r = authenticated_client.get(IVE_URL, {"months": 3})
        assert r.status_code == 200
        assert len(r.data["monthly_data"]) == 1
        row = r.data["monthly_data"][0]
        assert Decimal(row["income"]) == Decimal("500")
        assert Decimal(row["expense"]) == Decimal("100")
        assert Decimal(row["net"]) == Decimal("400")


class TestExport:
    def test_export_expenses_csv_and_logs(
        self, authenticated_client, user, expense_factory, category_factory
    ):
        cat = category_factory(user=user, name="Food")
        expense_factory(user=user, category=cat, amount=Decimal("10"), merchant="M1")
        r = authenticated_client.get(EXPORT_URL, {"type": "expenses"})
        assert r.status_code == 200
        assert r["Content-Type"].startswith("text/csv")
        body = b"".join(r.streaming_content).decode() if r.streaming else r.content.decode()
        assert "Date,Amount" in body
        assert "M1" in body
        assert AuditLog.objects.filter(user=user, action="export", resource_type="expense").exists()

    def test_export_incomes(self, authenticated_client, user, income_factory):
        income_factory(user=user, source_name="Gig", amount=Decimal("500"))
        r = authenticated_client.get(EXPORT_URL, {"type": "incomes"})
        assert r.status_code == 200
        body = r.content.decode()
        assert "Gig" in body
        assert AuditLog.objects.filter(user=user, action="export", resource_type="income").exists()


class TestAuditLogs:
    def test_list_scoped(self, authenticated_client, user, other_user):
        AuditLog.objects.create(user=user, action="create", resource_type="expense")
        AuditLog.objects.create(user=other_user, action="create", resource_type="expense")
        r = authenticated_client.get(AUDIT_LIST)
        assert len(r.data["results"]) == 1

    def test_filter_by_action(self, authenticated_client, user):
        AuditLog.objects.create(user=user, action="create", resource_type="expense")
        AuditLog.objects.create(user=user, action="delete", resource_type="expense")
        r = authenticated_client.get(AUDIT_LIST, {"action": "delete"})
        assert len(r.data["results"]) == 1
        assert r.data["results"][0]["action"] == "delete"

    def test_retrieve(self, authenticated_client, user):
        log = AuditLog.objects.create(
            user=user, action="update", resource_type="budget", changes={"a": 1}
        )
        r = authenticated_client.get(reverse("reports:audit-log-detail", args=[log.pk]))
        assert r.status_code == 200
        assert r.data["changes"] == {"a": 1}


class TestCurrency:
    def test_rates_returns_latest(self, authenticated_client):
        now = timezone.now()
        CurrencyRate.objects.create(
            base_currency="NPR",
            target_currency="USD",
            rate=Decimal("0.007500"),
            fetched_at=now - timedelta(days=1),
        )
        CurrencyRate.objects.create(
            base_currency="NPR",
            target_currency="USD",
            rate=Decimal("0.007600"),
            fetched_at=now,
        )
        CurrencyRate.objects.create(
            base_currency="NPR",
            target_currency="EUR",
            rate=Decimal("0.0069"),
            fetched_at=now,
        )
        r = authenticated_client.get(RATES_URL, {"base": "NPR"})
        assert r.data["base"] == "NPR"
        assert Decimal(r.data["rates"]["USD"]) == Decimal("0.007600")
        assert "EUR" in r.data["rates"]

    def test_convert(self, authenticated_client):
        CurrencyRate.objects.create(
            base_currency="USD",
            target_currency="NPR",
            rate=Decimal("133.000000"),
            fetched_at=timezone.now(),
        )
        r = authenticated_client.get(
            CONVERT_URL, {"source": "USD", "target": "NPR", "amount": "10"}
        )
        assert r.status_code == 200
        assert Decimal(r.data["converted"]) == Decimal("1330.00")

    def test_convert_missing_rate_404(self, authenticated_client):
        r = authenticated_client.get(
            CONVERT_URL, {"source": "XXX", "target": "YYY", "amount": "10"}
        )
        assert r.status_code == 404

    def test_convert_invalid_amount(self, authenticated_client):
        r = authenticated_client.get(
            CONVERT_URL, {"source": "USD", "target": "NPR", "amount": "abc"}
        )
        assert r.status_code == 400
