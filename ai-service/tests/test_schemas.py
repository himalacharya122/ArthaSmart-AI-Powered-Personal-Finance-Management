"""Schema validation tests.

Pydantic schemas are the contract between Django and the AI service.
These tests lock the validation rules in place so breaking changes
surface in CI rather than in production with a cryptic 422.
"""

from __future__ import annotations

import pytest  # type: ignore
from pydantic import ValidationError  # type: ignore

from app.schemas.chat import ChatRequest, UserContext
from app.schemas.insights import (
    AnomalyCheckRequest,
    InsightRequest,
    MemoryUpdateRequest,
)


class TestChatRequest:
    def _base(self, **overrides) -> dict:
        data = {
            "message": "hi",
            "conversation_id": 1,
            "user_context": {"user_id": 1},
        }
        data.update(overrides)
        return data

    def test_valid_minimal(self):
        ChatRequest(**self._base())

    def test_empty_message_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(**self._base(message=""))

    def test_overlong_message_rejected(self):
        with pytest.raises(ValidationError):
            ChatRequest(**self._base(message="x" * 4001))

    def test_max_length_message_accepted(self):
        ChatRequest(**self._base(message="x" * 4000))

    def test_missing_conversation_id(self):
        data = self._base()
        del data["conversation_id"]
        with pytest.raises(ValidationError):
            ChatRequest(**data)

    def test_missing_user_context_user_id(self):
        with pytest.raises(ValidationError):
            ChatRequest(**self._base(user_context={}))

    def test_defaults_for_history_and_memory(self):
        req = ChatRequest(**self._base())
        assert req.conversation_history == []
        assert req.user_memory.facts == []
        assert req.user_memory.goals == []


class TestUserContextDefaults:
    def test_currency_defaults_to_NPR(self):
        ctx = UserContext(user_id=1)
        assert ctx.preferred_currency == "NPR"

    def test_empty_collections_by_default(self):
        ctx = UserContext(user_id=1)
        assert ctx.active_budgets == []
        assert ctx.recent_transactions == []
        assert ctx.top_categories == []
        assert ctx.category_list == []


class TestInsightRequest:
    def test_valid_minimal(self):
        InsightRequest(user_id=1)

    def test_missing_user_id(self):
        with pytest.raises(ValidationError):
            InsightRequest()


class TestAnomalyCheckRequest:
    def test_valid_minimal(self):
        AnomalyCheckRequest(expense_amount=100, expense_category="Food")

    def test_missing_amount(self):
        with pytest.raises(ValidationError):
            AnomalyCheckRequest(expense_category="Food")

    def test_missing_category(self):
        with pytest.raises(ValidationError):
            AnomalyCheckRequest(expense_amount=100)


class TestMemoryUpdateRequest:
    def test_valid_minimal(self):
        MemoryUpdateRequest(user_id=1)

    def test_missing_user_id(self):
        with pytest.raises(ValidationError):
            MemoryUpdateRequest()
