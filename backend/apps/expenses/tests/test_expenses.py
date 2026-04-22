"""ExpenseViewSet — CRUD, scoping, soft-delete, summary, filters."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.expenses.models import Expense

pytestmark = pytest.mark.django_db

LIST_URL = reverse("expenses:expense-list")
SUMMARY_URL = reverse("expenses:expense-summary")


def _detail(pk):
    return reverse("expenses:expense-detail", args=[pk])


class TestExpenseList:
    def test_scoped_to_user(self, authenticated_client, expense_factory, user, other_user):
        expense_factory(user=user, description="mine")
        expense_factory(user=other_user, description="theirs")
        r = authenticated_client.get(LIST_URL)
        assert r.status_code == 200
        descs = {e["description"] for e in r.data["results"]}
        assert descs == {"mine"}

    def test_soft_deleted_hidden(self, authenticated_client, expense_factory, user):
        expense_factory(user=user, description="kept")
        expense_factory(user=user, description="gone", is_deleted=True)
        r = authenticated_client.get(LIST_URL)
        descs = {e["description"] for e in r.data["results"]}
        assert descs == {"kept"}

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401

    def test_filter_by_date_range(self, authenticated_client, expense_factory, user):
        expense_factory(user=user, date=date(2026, 1, 1), description="old")
        expense_factory(user=user, date=date(2026, 4, 1), description="new")
        r = authenticated_client.get(
            LIST_URL, {"date_after": "2026-03-01", "date_before": "2026-04-30"}
        )
        descs = {e["description"] for e in r.data["results"]}
        assert descs == {"new"}

    def test_filter_by_min_max_amount(self, authenticated_client, expense_factory, user):
        expense_factory(user=user, amount=Decimal("50"), description="cheap")
        expense_factory(user=user, amount=Decimal("500"), description="big")
        r = authenticated_client.get(LIST_URL, {"min_amount": "100"})
        descs = {e["description"] for e in r.data["results"]}
        assert descs == {"big"}

    def test_search_by_merchant(self, authenticated_client, expense_factory, user):
        expense_factory(user=user, merchant="Starbucks", description="coffee")
        expense_factory(user=user, merchant="Shell", description="gas")
        r = authenticated_client.get(LIST_URL, {"search": "Starbucks"})
        descs = {e["description"] for e in r.data["results"]}
        assert descs == {"coffee"}


class TestExpenseCreate:
    def test_success(self, authenticated_client, category_factory, user):
        cat = category_factory(user=user)
        r = authenticated_client.post(
            LIST_URL,
            {
                "amount": "250.50",
                "currency": "NPR",
                "description": "Lunch",
                "merchant": "KFC",
                "date": "2026-04-22",
                "category_id": cat.id,
            },
            format="json",
        )
        assert r.status_code == 201
        e = Expense.objects.get(description="Lunch")
        assert e.user == user
        assert e.source == "manual"
        assert e.amount == Decimal("250.50")
        assert e.category == cat

    def test_negative_amount_rejected(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL,
            {"amount": "-10", "date": "2026-04-22"},
            format="json",
        )
        assert r.status_code == 400

    def test_zero_amount_rejected(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL,
            {"amount": "0", "date": "2026-04-22"},
            format="json",
        )
        assert r.status_code == 400

    def test_source_cannot_be_set_via_api(self, authenticated_client):
        """perform_create hardcodes source=manual."""
        r = authenticated_client.post(
            LIST_URL,
            {"amount": "100", "date": "2026-04-22", "source": "ocr"},
            format="json",
        )
        assert r.status_code == 201
        assert Expense.objects.get(pk=r.data["id"]).source == "manual"


class TestExpenseRetrieveUpdate:
    def test_retrieve_own(self, authenticated_client, expense_factory, user):
        e = expense_factory(user=user)
        r = authenticated_client.get(_detail(e.pk))
        assert r.status_code == 200

    def test_cannot_retrieve_others(self, authenticated_client, expense_factory, other_user):
        e = expense_factory(user=other_user)
        assert authenticated_client.get(_detail(e.pk)).status_code == 404

    def test_patch_updates(self, authenticated_client, expense_factory, user):
        e = expense_factory(user=user)
        r = authenticated_client.patch(_detail(e.pk), {"description": "updated"}, format="json")
        assert r.status_code == 200
        e.refresh_from_db()
        assert e.description == "updated"


class TestExpenseDelete:
    def test_soft_deletes(self, authenticated_client, expense_factory, user):
        e = expense_factory(user=user)
        r = authenticated_client.delete(_detail(e.pk))
        assert r.status_code == 204
        e.refresh_from_db()
        assert e.is_deleted is True
        assert Expense.objects.filter(pk=e.pk).exists()

    def test_cannot_delete_others(self, authenticated_client, expense_factory, other_user):
        e = expense_factory(user=other_user)
        assert authenticated_client.delete(_detail(e.pk)).status_code == 404


class TestExpenseSummary:
    def test_returns_totals(self, authenticated_client, expense_factory, category_factory, user):
        food = category_factory(user=user, name="Food")
        tx = category_factory(user=user, name="Transport")
        expense_factory(user=user, category=food, amount=Decimal("100"))
        expense_factory(user=user, category=food, amount=Decimal("50"))
        expense_factory(user=user, category=tx, amount=Decimal("200"))
        r = authenticated_client.get(SUMMARY_URL)
        assert r.status_code == 200
        assert Decimal(r.data["total"]) == Decimal("350")
        cats = {c["name"]: Decimal(c["total"]) for c in r.data["by_category"]}
        assert cats["Food"] == Decimal("150")
        assert cats["Transport"] == Decimal("200")

    def test_uncategorized_fallback(self, authenticated_client, expense_factory, user):
        expense_factory(user=user, category=None, amount=Decimal("42"))
        r = authenticated_client.get(SUMMARY_URL)
        names = [c["name"] for c in r.data["by_category"]]
        assert "Uncategorized" in names

    def test_by_month_grouping(self, authenticated_client, expense_factory, user):
        expense_factory(user=user, date=date(2026, 1, 5), amount=Decimal("100"))
        expense_factory(user=user, date=date(2026, 1, 20), amount=Decimal("50"))
        expense_factory(user=user, date=date(2026, 2, 1), amount=Decimal("80"))
        r = authenticated_client.get(SUMMARY_URL)
        months = {m["month"]: Decimal(m["total"]) for m in r.data["by_month"]}
        assert months["2026-01"] == Decimal("150")
        assert months["2026-02"] == Decimal("80")

    def test_empty_user_returns_zero(self, authenticated_client):
        r = authenticated_client.get(SUMMARY_URL)
        assert r.status_code == 200
        assert Decimal(r.data["total"]) == 0

    def test_respects_date_filter(self, authenticated_client, expense_factory, user):
        expense_factory(user=user, date=date(2026, 1, 5), amount=Decimal("100"))
        expense_factory(user=user, date=date(2026, 4, 1), amount=Decimal("999"))
        r = authenticated_client.get(SUMMARY_URL, {"date_after": "2026-03-01"})
        assert Decimal(r.data["total"]) == Decimal("999")


class TestAnomalySignalDisabled:
    """Sanity check: the autouse fixture really disconnected the signal."""

    def test_expense_create_does_not_spawn_thread(
        self, authenticated_client, category_factory, user, monkeypatch
    ):
        import threading

        original = threading.Thread
        calls = []

        def spy(*a, **kw):
            calls.append((a, kw))
            return original(*a, **kw)

        monkeypatch.setattr("threading.Thread", spy)
        cat = category_factory(user=user)
        r = authenticated_client.post(
            LIST_URL,
            {"amount": "10", "date": "2026-04-22", "category_id": cat.id},
            format="json",
        )
        assert r.status_code == 201
        # No thread spawned because the signal is disconnected
        assert calls == []


_ = timedelta  # silence unused import when trimming
