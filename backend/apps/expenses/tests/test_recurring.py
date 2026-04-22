"""RecurringTransactionViewSet — CRUD, pause/resume, scoping."""

from __future__ import annotations

from datetime import date, timedelta

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

pytestmark = pytest.mark.django_db

LIST_URL = reverse("recurring_transactions:recurring-transaction-list")


def _detail(pk):
    return reverse("recurring_transactions:recurring-transaction-detail", args=[pk])


def _pause(pk):
    return reverse("recurring_transactions:recurring-transaction-pause", args=[pk])


def _resume(pk):
    return reverse("recurring_transactions:recurring-transaction-resume", args=[pk])


class TestRecurringCRUD:
    def test_list_scoped_to_user(self, authenticated_client, recurring_factory, user, other_user):
        recurring_factory(user=user)
        recurring_factory(user=other_user)
        r = authenticated_client.get(LIST_URL)
        assert r.status_code == 200
        assert len(r.data["results"]) == 1

    def test_create(self, authenticated_client, user):
        r = authenticated_client.post(
            LIST_URL,
            {
                "type": "expense",
                "amount": "1000",
                "currency": "NPR",
                "frequency": "monthly",
                "day_of_month": 1,
                "next_occurrence": str(date.today() + timedelta(days=1)),
                "merchant": "Netflix",
            },
            format="json",
        )
        assert r.status_code == 201
        assert r.data["merchant"] == "Netflix"

    def test_negative_amount_rejected(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL,
            {
                "type": "expense",
                "amount": "-5",
                "frequency": "monthly",
                "next_occurrence": "2026-05-01",
            },
            format="json",
        )
        assert r.status_code == 400

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401


class TestPauseResume:
    def test_pause_sets_inactive(self, authenticated_client, recurring_factory, user):
        rt = recurring_factory(user=user, is_active=True)
        r = authenticated_client.post(_pause(rt.pk))
        assert r.status_code == 200
        assert r.data["is_active"] is False
        rt.refresh_from_db()
        assert rt.is_active is False

    def test_resume_sets_active(self, authenticated_client, recurring_factory, user):
        rt = recurring_factory(user=user, is_active=False)
        r = authenticated_client.post(_resume(rt.pk))
        assert r.status_code == 200
        assert r.data["is_active"] is True
        rt.refresh_from_db()
        assert rt.is_active is True

    def test_cannot_pause_others(self, authenticated_client, recurring_factory, other_user):
        rt = recurring_factory(user=other_user)
        assert authenticated_client.post(_pause(rt.pk)).status_code == 404


class TestRecurringDelete:
    def test_hard_delete(self, authenticated_client, recurring_factory, user):
        """No soft-delete for recurring rules — DELETE removes the row."""
        from apps.expenses.models import RecurringTransaction

        rt = recurring_factory(user=user)
        r = authenticated_client.delete(_detail(rt.pk))
        assert r.status_code == 204
        assert not RecurringTransaction.objects.filter(pk=rt.pk).exists()
