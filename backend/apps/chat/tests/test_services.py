"""Chat service layer — ai_client, action_executor, context_builder."""

from __future__ import annotations

import re
from decimal import Decimal

import httpx  # type: ignore
import pytest  # type: ignore

from apps.chat.services.action_executor import execute_actions
from apps.chat.services.ai_client import call_ai_chat
from apps.chat.services.context_builder import build_user_context, build_user_memory

pytestmark = pytest.mark.django_db


# ---------------------------------------------------------------------------
# ai_client.call_ai_chat — delegates to httpx and handles failure modes
# ---------------------------------------------------------------------------


class TestCallAIChat:
    def test_success_returns_payload(self, httpx_mock):
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/chat"),
            json={
                "reply": "hi",
                "intent": "general",
                "actions": [],
                "memory_updates": [],
                "tokens_used": 5,
                "response_time_ms": 42,
            },
        )
        r = call_ai_chat({"message": "x"})
        assert r["reply"] == "hi"
        assert r["tokens_used"] == 5

    def test_connect_error_fallback(self, httpx_mock):
        httpx_mock.add_exception(httpx.ConnectError("down"))
        r = call_ai_chat({"message": "x"})
        assert "trouble connecting" in r["reply"].lower()
        assert r["actions"] == []

    def test_timeout_fallback(self, httpx_mock):
        httpx_mock.add_exception(httpx.TimeoutException("slow"))
        r = call_ai_chat({"message": "x"})
        assert "too long" in r["reply"].lower()

    def test_rate_limit_forwards_detail(self, httpx_mock):
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/chat"),
            status_code=429,
            json={"detail": "slow down buddy"},
        )
        r = call_ai_chat({"message": "x"})
        assert "slow down buddy" in r["reply"]

    def test_500_returns_generic_fallback(self, httpx_mock):
        httpx_mock.add_response(url=re.compile(r".*/api/v1/chat"), status_code=500)
        r = call_ai_chat({"message": "x"})
        assert "something went wrong" in r["reply"].lower()


# ---------------------------------------------------------------------------
# action_executor.execute_actions
# ---------------------------------------------------------------------------


class TestExecuteActions:
    def test_create_expense(self, user, category_factory):
        category_factory(user=user, name="Food", type="expense")
        r = execute_actions(
            user,
            [
                {
                    "type": "create_expense",
                    "data": {
                        "amount": 150,
                        "category": "Food",
                        "merchant": "KFC",
                        "date": "2026-04-22",
                    },
                }
            ],
        )
        assert r["errors"] == []
        assert len(r["executed"]) == 1
        from apps.expenses.models import Expense

        e = Expense.objects.get(merchant="KFC")
        assert e.source == "chatbot"
        assert e.amount == Decimal("150")
        assert e.category.name == "Food"

    def test_create_expense_invalid_amount_errors(self, user):
        r = execute_actions(user, [{"type": "create_expense", "data": {"amount": 0}}])
        assert r["executed"] == []
        assert len(r["errors"]) == 1

    def test_create_income(self, user):
        r = execute_actions(
            user,
            [
                {
                    "type": "create_income",
                    "data": {"amount": 5000, "source_name": "Gig"},
                }
            ],
        )
        from apps.expenses.models import Income

        assert Income.objects.filter(user=user, source_name="Gig").exists()
        assert r["errors"] == []

    def test_unknown_action_errors(self, user):
        r = execute_actions(user, [{"type": "blow_up_server", "data": {}}])
        assert r["executed"] == []
        assert len(r["errors"]) == 1
        assert "Unknown" in r["errors"][0]["error"]

    def test_update_expense(self, user, expense_factory):
        e = expense_factory(user=user, amount=Decimal("10"))
        r = execute_actions(
            user,
            [
                {
                    "type": "update_expense",
                    "data": {"expense_id": e.id, "amount": 99},
                }
            ],
        )
        assert r["errors"] == []
        e.refresh_from_db()
        assert e.amount == Decimal("99")

    def test_delete_expense_soft_deletes(self, user, expense_factory):
        e = expense_factory(user=user)
        r = execute_actions(
            user,
            [{"type": "delete_expense", "data": {"expense_id": e.id}}],
        )
        assert r["errors"] == []
        e.refresh_from_db()
        assert e.is_deleted is True

    def test_delete_expense_wrong_user_errors(self, user, other_user, expense_factory):
        e = expense_factory(user=other_user)
        r = execute_actions(user, [{"type": "delete_expense", "data": {"expense_id": e.id}}])
        assert len(r["errors"]) == 1

    def test_fuzzy_category_resolution(self, user, category_factory):
        category_factory(user=user, name="Food & Drink", type="expense")
        r = execute_actions(
            user,
            [
                {
                    "type": "create_expense",
                    "data": {"amount": 10, "category": "food"},
                }
            ],
        )
        assert r["errors"] == []
        from apps.expenses.models import Expense

        assert Expense.objects.filter(category__name="Food & Drink").exists()


# ---------------------------------------------------------------------------
# context_builder
# ---------------------------------------------------------------------------


class TestBuildUserContext:
    def test_empty_user_safe_defaults(self, user):
        ctx = build_user_context(user)
        assert ctx["total_expenses_this_month"] == 0
        assert ctx["total_income_this_month"] == 0
        assert ctx["active_budgets"] == []
        assert ctx["top_categories"] == []

    def test_calculates_savings_rate(self, user, expense_factory, income_factory):
        from datetime import date

        today = date.today().replace(day=15)
        expense_factory(user=user, amount=Decimal("300"), date=today)
        income_factory(user=user, amount=Decimal("1000"), date=today)
        ctx = build_user_context(user)
        # 70% savings
        assert ctx["savings_rate"] == pytest.approx(70.0, abs=1)

    def test_includes_active_budgets(self, user, budget_factory):
        budget_factory(user=user, name="Food B", is_active=True)
        budget_factory(user=user, name="Inactive B", is_active=False)
        ctx = build_user_context(user)
        names = [b["name"] for b in ctx["active_budgets"]]
        assert "Food B" in names
        assert "Inactive B" not in names


class TestBuildUserMemory:
    def test_returns_empty_for_new_user(self, user):
        mem = build_user_memory(user)
        assert mem["facts"] == []
        assert mem["goals"] == []

    def test_loads_existing_memory(self, user):
        from apps.chat.models import UserAIMemory

        UserAIMemory.objects.create(
            user=user,
            facts=["Likes coffee"],
            goals=["Save 5000"],
            financial_personality="saver",
        )
        mem = build_user_memory(user)
        assert mem["facts"] == ["Likes coffee"]
        assert mem["goals"] == ["Save 5000"]
