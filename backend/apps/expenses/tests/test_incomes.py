"""IncomeViewSet — CRUD, scoping, soft-delete, summary."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.expenses.models import Income

pytestmark = pytest.mark.django_db

LIST_URL = reverse("incomes:income-list")
SUMMARY_URL = reverse("incomes:income-summary")


def _detail(pk):
    return reverse("incomes:income-detail", args=[pk])


class TestIncomeList:
    def test_scoped_to_user(self, authenticated_client, income_factory, user, other_user):
        income_factory(user=user, source_name="mine")
        income_factory(user=other_user, source_name="theirs")
        r = authenticated_client.get(LIST_URL)
        names = {i["source_name"] for i in r.data["results"]}
        assert names == {"mine"}

    def test_soft_deleted_hidden(self, authenticated_client, income_factory, user):
        income_factory(user=user, source_name="kept")
        income_factory(user=user, source_name="gone", is_deleted=True)
        r = authenticated_client.get(LIST_URL)
        names = {i["source_name"] for i in r.data["results"]}
        assert names == {"kept"}

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401


class TestIncomeCreate:
    def test_success(self, authenticated_client, user):
        r = authenticated_client.post(
            LIST_URL,
            {
                "amount": "30000",
                "currency": "NPR",
                "source_name": "Monthly Salary",
                "date": "2026-04-01",
            },
            format="json",
        )
        assert r.status_code == 201
        inc = Income.objects.get(source_name="Monthly Salary")
        assert inc.user == user

    def test_negative_amount_rejected(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL,
            {"amount": "-50", "source_name": "x", "date": "2026-04-22"},
            format="json",
        )
        assert r.status_code == 400

    def test_missing_source_name_rejected(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL, {"amount": "1000", "date": "2026-04-22"}, format="json"
        )
        assert r.status_code == 400


class TestIncomeDelete:
    def test_soft_deletes(self, authenticated_client, income_factory, user):
        i = income_factory(user=user)
        r = authenticated_client.delete(_detail(i.pk))
        assert r.status_code == 204
        i.refresh_from_db()
        assert i.is_deleted is True

    def test_cannot_delete_others(self, authenticated_client, income_factory, other_user):
        i = income_factory(user=other_user)
        assert authenticated_client.delete(_detail(i.pk)).status_code == 404


class TestIncomeSummary:
    def test_by_source_grouping(self, authenticated_client, income_factory, user):
        income_factory(user=user, source_name="Salary", amount=Decimal("30000"))
        income_factory(user=user, source_name="Salary", amount=Decimal("30000"))
        income_factory(user=user, source_name="Freelance", amount=Decimal("5000"))
        r = authenticated_client.get(SUMMARY_URL)
        sources = {s["source_name"]: Decimal(s["total"]) for s in r.data["by_source"]}
        assert sources["Salary"] == Decimal("60000")
        assert sources["Freelance"] == Decimal("5000")

    def test_by_month(self, authenticated_client, income_factory, user):
        income_factory(user=user, date=date(2026, 1, 1), amount=Decimal("100"))
        income_factory(user=user, date=date(2026, 2, 1), amount=Decimal("200"))
        r = authenticated_client.get(SUMMARY_URL)
        months = {m["month"] for m in r.data["by_month"]}
        assert {"2026-01", "2026-02"} <= months

    def test_empty_user_returns_zero(self, authenticated_client):
        r = authenticated_client.get(SUMMARY_URL)
        assert Decimal(r.data["total"]) == 0
