"""Budget model + ViewSet tests."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.budgets.models import Budget

pytestmark = pytest.mark.django_db

LIST_URL = reverse("budgets:budget-list")


def _detail(pk):
    return reverse("budgets:budget-detail", args=[pk])


def _check(pk):
    return reverse("budgets:budget-check-alerts", args=[pk])


class TestBudgetModelProperties:
    def test_percentage_used(self, budget_factory, user):
        b = budget_factory(user=user, amount=Decimal("1000"), spent=Decimal("250"))
        assert b.percentage_used == 25.0

    def test_percentage_used_zero_amount(self, user):
        b = Budget(
            user=user,
            name="Zero",
            amount=Decimal("0"),
            spent=Decimal("10"),
            start_date=date.today(),
            end_date=date.today(),
        )
        assert b.percentage_used == 0

    def test_is_over_budget(self, budget_factory, user):
        under = budget_factory(user=user, amount=Decimal("100"), spent=Decimal("50"))
        over = budget_factory(user=user, amount=Decimal("100"), spent=Decimal("150"))
        assert under.is_over_budget is False
        assert over.is_over_budget is True

    def test_remaining_never_negative(self, budget_factory, user):
        b = budget_factory(user=user, amount=Decimal("100"), spent=Decimal("150"))
        assert b.remaining == 0

    def test_remaining_positive(self, budget_factory, user):
        b = budget_factory(user=user, amount=Decimal("100"), spent=Decimal("30"))
        assert b.remaining == Decimal("70")


class TestBudgetCRUD:
    def test_list_scoped(self, authenticated_client, budget_factory, user, other_user):
        budget_factory(user=user)
        budget_factory(user=other_user)
        r = authenticated_client.get(LIST_URL)
        assert len(r.data["results"]) == 1

    def test_create(self, authenticated_client, user):
        r = authenticated_client.post(
            LIST_URL,
            {
                "name": "Food Budget",
                "amount": "5000",
                "currency": "NPR",
                "period": "monthly",
                "start_date": "2026-04-01",
                "end_date": "2026-04-30",
            },
            format="json",
        )
        assert r.status_code == 201
        assert Budget.objects.get(name="Food Budget").user == user

    def test_negative_amount_rejected(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL,
            {
                "name": "Bad",
                "amount": "-100",
                "start_date": "2026-04-01",
                "end_date": "2026-04-30",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_end_before_start_rejected(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL,
            {
                "name": "Bad",
                "amount": "100",
                "start_date": "2026-04-30",
                "end_date": "2026-04-01",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401

    def test_cannot_access_others(self, authenticated_client, budget_factory, other_user):
        b = budget_factory(user=other_user)
        assert authenticated_client.get(_detail(b.pk)).status_code == 404


class TestBudgetRetrieveRecalculates:
    def test_retrieve_recalculates_spent(
        self, authenticated_client, budget_factory, expense_factory, user
    ):
        b = budget_factory(
            user=user,
            amount=Decimal("1000"),
            spent=Decimal("0"),
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
            category=None,
        )
        expense_factory(user=user, amount=Decimal("300"), date=date(2026, 4, 5))
        expense_factory(user=user, amount=Decimal("150"), date=date(2026, 4, 10))
        # Outside window
        expense_factory(user=user, amount=Decimal("999"), date=date(2026, 5, 1))

        r = authenticated_client.get(_detail(b.pk))
        assert r.status_code == 200
        assert Decimal(r.data["spent"]) == Decimal("450")
        b.refresh_from_db()
        assert b.spent == Decimal("450")

    def test_recalculate_filters_by_category(
        self,
        authenticated_client,
        budget_factory,
        expense_factory,
        category_factory,
        user,
    ):
        food = category_factory(user=user, name="Food")
        other = category_factory(user=user, name="Other")
        b = budget_factory(
            user=user,
            amount=Decimal("1000"),
            category=food,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
        )
        expense_factory(user=user, amount=Decimal("100"), category=food, date=date(2026, 4, 5))
        expense_factory(user=user, amount=Decimal("500"), category=other, date=date(2026, 4, 5))

        r = authenticated_client.get(_detail(b.pk))
        assert Decimal(r.data["spent"]) == Decimal("100")

    def test_recalculate_ignores_soft_deleted(
        self, authenticated_client, budget_factory, expense_factory, user
    ):
        b = budget_factory(
            user=user,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
            category=None,
        )
        expense_factory(user=user, amount=Decimal("100"), date=date(2026, 4, 5))
        expense_factory(user=user, amount=Decimal("999"), date=date(2026, 4, 5), is_deleted=True)
        r = authenticated_client.get(_detail(b.pk))
        assert Decimal(r.data["spent"]) == Decimal("100")


class TestCheckAlerts:
    def test_triggers_when_over_threshold(
        self, authenticated_client, budget_factory, expense_factory, user
    ):
        b = budget_factory(
            user=user,
            amount=Decimal("100"),
            alert_threshold=80,
            alert_sent=False,
            category=None,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
        )
        expense_factory(user=user, amount=Decimal("90"), date=date(2026, 4, 5))
        r = authenticated_client.post(_check(b.pk))
        assert r.status_code == 200
        assert r.data["alert_triggered"] is True
        b.refresh_from_db()
        assert b.alert_sent is True

    def test_not_triggered_below_threshold(
        self, authenticated_client, budget_factory, expense_factory, user
    ):
        b = budget_factory(
            user=user,
            amount=Decimal("100"),
            alert_threshold=80,
            category=None,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
        )
        expense_factory(user=user, amount=Decimal("10"), date=date(2026, 4, 5))
        r = authenticated_client.post(_check(b.pk))
        assert r.data["alert_triggered"] is False

    def test_not_re_triggered_if_already_sent(
        self, authenticated_client, budget_factory, expense_factory, user
    ):
        b = budget_factory(
            user=user,
            amount=Decimal("100"),
            alert_threshold=80,
            alert_sent=True,
            category=None,
            start_date=date(2026, 4, 1),
            end_date=date(2026, 4, 30),
        )
        expense_factory(user=user, amount=Decimal("99"), date=date(2026, 4, 5))
        r = authenticated_client.post(_check(b.pk))
        assert r.data["alert_triggered"] is False


class TestBudgetDelete:
    def test_hard_delete(self, authenticated_client, budget_factory, user):
        b = budget_factory(user=user)
        assert authenticated_client.delete(_detail(b.pk)).status_code == 204
        assert not Budget.objects.filter(pk=b.pk).exists()
