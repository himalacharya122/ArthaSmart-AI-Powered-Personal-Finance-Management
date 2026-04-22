"""Service layer — generate_insights_for_user, check_expense_anomaly."""

from __future__ import annotations

import re
from datetime import date, timedelta
from decimal import Decimal

import pytest  # type: ignore

from apps.ai_insights.models import AIInsight
from apps.ai_insights.services import (
    check_expense_anomaly,
    generate_insights_for_user,
    update_user_memory,
)

pytestmark = pytest.mark.django_db


class TestGenerateInsightsForUser:
    def test_persists_insights_from_ai_response(self, user, httpx_mock):
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/insights/generate"),
            json={
                "insights": [
                    {
                        "insight_type": "suggestion",
                        "title": "Hi",
                        "description": "d",
                        "severity": "info",
                    }
                ]
            },
        )
        result = generate_insights_for_user(user)
        assert len(result) == 1
        assert AIInsight.objects.filter(user=user).count() == 1

    def test_creates_notifications_for_warning_insights(self, user, httpx_mock):
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/insights/generate"),
            json={
                "insights": [
                    {
                        "insight_type": "anomaly",
                        "title": "Critical",
                        "description": "!",
                        "severity": "critical",
                    },
                    {
                        "insight_type": "suggestion",
                        "title": "Info",
                        "description": "...",
                        "severity": "info",
                    },
                ]
            },
        )
        generate_insights_for_user(user)
        from apps.notifications.models import Notification

        # Only the critical one triggers a notification
        assert Notification.objects.filter(user=user).count() == 1

    def test_http_failure_returns_empty(self, user, httpx_mock):
        httpx_mock.add_response(url=re.compile(r".*/api/v1/insights/generate"), status_code=500)
        result = generate_insights_for_user(user)
        assert result == []
        assert AIInsight.objects.filter(user=user).count() == 0


class TestCheckExpenseAnomaly:
    def test_no_category_returns_false(self, user, expense_factory, httpx_mock):
        e = expense_factory(user=user, category=None)
        assert check_expense_anomaly(user, e) is False
        # No AI call was made
        assert len(httpx_mock.get_requests()) == 0

    def test_insufficient_history_returns_false(
        self, user, expense_factory, category_factory, httpx_mock
    ):
        cat = category_factory(user=user)
        # Only 2 prior expenses — need 3+
        expense_factory(user=user, category=cat, amount=Decimal("10"))
        expense_factory(user=user, category=cat, amount=Decimal("12"))
        new = expense_factory(user=user, category=cat, amount=Decimal("500"))
        assert check_expense_anomaly(user, new) is False
        assert len(httpx_mock.get_requests()) == 0

    def test_anomaly_creates_insight_and_notification(
        self, user, expense_factory, category_factory, httpx_mock
    ):
        cat = category_factory(user=user, name="Food")
        for _ in range(5):
            expense_factory(user=user, category=cat, amount=Decimal("10"))
        new = expense_factory(user=user, category=cat, amount=Decimal("500"), merchant="Weird")
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/anomaly/check"),
            json={
                "is_anomaly": True,
                "confidence": 0.9,
                "reason": "Way above avg",
                "suggestion": "Check it",
            },
        )
        assert check_expense_anomaly(user, new) is True
        assert AIInsight.objects.filter(user=user, insight_type="anomaly").exists()
        from apps.notifications.models import Notification

        assert Notification.objects.filter(user=user, notification_type="anomaly").exists()

    def test_no_anomaly_creates_nothing(self, user, expense_factory, category_factory, httpx_mock):
        cat = category_factory(user=user)
        for _ in range(5):
            expense_factory(user=user, category=cat, amount=Decimal("10"))
        new = expense_factory(user=user, category=cat, amount=Decimal("11"))
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/anomaly/check"),
            json={"is_anomaly": False, "confidence": 0.1},
        )
        assert check_expense_anomaly(user, new) is False
        assert not AIInsight.objects.filter(user=user).exists()

    def test_http_error_returns_false(self, user, expense_factory, category_factory, httpx_mock):
        cat = category_factory(user=user)
        for _ in range(5):
            expense_factory(user=user, category=cat, amount=Decimal("10"))
        new = expense_factory(user=user, category=cat, amount=Decimal("500"))
        httpx_mock.add_response(url=re.compile(r".*/api/v1/anomaly/check"), status_code=500)
        assert check_expense_anomaly(user, new) is False


class TestUpdateUserMemory:
    def test_writes_memory_fields(self, user, httpx_mock):
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/memory/analyze"),
            json={
                "financial_personality": "spender",
                "new_facts": ["Has pets"],
                "spending_patterns": {"peak": "Fri"},
                "conversation_summary": "User mostly shops online.",
            },
        )
        result = update_user_memory(user)
        assert result["financial_personality"] == "spender"
        from apps.chat.models import UserAIMemory

        mem = UserAIMemory.objects.get(user=user)
        assert mem.financial_personality == "spender"
        assert "Has pets" in mem.facts
        assert mem.spending_patterns == {"peak": "Fri"}

    def test_existing_facts_deduped(self, user, httpx_mock):
        from apps.chat.models import UserAIMemory

        UserAIMemory.objects.create(user=user, facts=["Has pets"])
        httpx_mock.add_response(
            url=re.compile(r".*/api/v1/memory/analyze"),
            json={"new_facts": ["Has pets", "Drinks coffee"]},
        )
        update_user_memory(user)
        mem = UserAIMemory.objects.get(user=user)
        assert mem.facts.count("Has pets") == 1
        assert "Drinks coffee" in mem.facts

    def test_http_failure_returns_empty(self, user, httpx_mock):
        httpx_mock.add_response(url=re.compile(r".*/api/v1/memory/analyze"), status_code=500)
        result = update_user_memory(user)
        assert result == {}


# Silence unused-import warnings for shared symbols:
_ = (date, timedelta)
