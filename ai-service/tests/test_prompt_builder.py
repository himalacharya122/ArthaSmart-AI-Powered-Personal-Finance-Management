"""Tests for prompt_builder.

The system prompt is what steers the LLM's behavior — if required fields
drift out of it, the model silently starts hallucinating data or calling
tools at the wrong time. Test the observable structure, not every word.
"""

from __future__ import annotations

from datetime import date

from app.schemas.chat import (
    BudgetContext,
    CategorySpending,
    RecentTransaction,
    UserContext,
    UserMemory,
)
from app.services.prompt_builder import build_messages, build_system_prompt


def _ctx(**overrides) -> UserContext:
    base = {"user_id": 1, "first_name": "Himal", "preferred_currency": "NPR"}
    base.update(overrides)
    return UserContext(**base)


class TestBuildSystemPrompt:
    def test_includes_today_iso_date(self):
        p = build_system_prompt(_ctx(), UserMemory())
        assert date.today().isoformat() in p

    def test_includes_currency(self):
        p = build_system_prompt(_ctx(preferred_currency="USD"), UserMemory())
        assert "USD" in p

    def test_includes_first_name(self):
        p = build_system_prompt(_ctx(first_name="Himal"), UserMemory())
        assert "Himal" in p

    def test_falls_back_to_there_when_no_first_name(self):
        p = build_system_prompt(_ctx(first_name=""), UserMemory())
        assert "there" in p

    def test_financial_snapshot_present(self):
        p = build_system_prompt(
            _ctx(
                total_income_this_month=50000,
                total_expenses_this_month=30000,
                savings_rate=40.0,
            ),
            UserMemory(),
        )
        assert "FINANCIAL SNAPSHOT" in p
        assert "50,000.00" in p
        assert "30,000.00" in p
        assert "40.0%" in p

    def test_over_budget_label_at_100_percent(self):
        ctx = _ctx(
            active_budgets=[
                BudgetContext(
                    name="Food",
                    amount=1000,
                    spent=1000,
                    remaining=0,
                    percentage_used=100.0,
                )
            ]
        )
        p = build_system_prompt(ctx, UserMemory())
        assert "OVER BUDGET" in p

    def test_under_budget_shows_percentage(self):
        ctx = _ctx(
            active_budgets=[
                BudgetContext(
                    name="Food",
                    amount=1000,
                    spent=500,
                    remaining=500,
                    percentage_used=50.0,
                )
            ]
        )
        p = build_system_prompt(ctx, UserMemory())
        assert "50% used" in p
        assert "OVER BUDGET" not in p

    def test_recent_transactions_capped_at_10(self):
        txs = [
            RecentTransaction(
                id=i, type="expense", merchant=f"M{i}", amount=100.0, date="2025-01-01"
            )
            for i in range(20)
        ]
        p = build_system_prompt(_ctx(recent_transactions=txs), UserMemory())
        # First 10 IDs included, 11th and beyond not
        assert "ID#0" in p
        assert "ID#9" in p
        assert "ID#10" not in p

    def test_top_categories_capped_at_5(self):
        cats = [CategorySpending(name=f"Cat{i}", total=100.0, count=1) for i in range(8)]
        p = build_system_prompt(_ctx(top_categories=cats), UserMemory())
        assert "Cat0" in p
        assert "Cat4" in p
        assert "Cat5" not in p

    def test_facts_shows_last_20(self):
        facts = [f"fact-{i}" for i in range(25)]
        p = build_system_prompt(_ctx(), UserMemory(facts=facts))
        # Older facts dropped
        assert "fact-0" not in p
        assert "fact-4" not in p
        # Last 20 kept
        assert "fact-5" in p
        assert "fact-24" in p

    def test_goals_rendered(self):
        p = build_system_prompt(_ctx(), UserMemory(goals=["Save Rs. 10,000 this month"]))
        assert "Save Rs. 10,000 this month" in p
        assert "FINANCIAL GOALS" in p

    def test_spending_patterns_keys_rendered(self):
        mem = UserMemory(
            spending_patterns={
                "avg_daily_spend": 1234.5,
                "peak_spending_days": ["Saturday", "Sunday"],
                "top_merchants": ["Bhatbhateni", "Daraz", "KFC", "Foodmandu", "Bhoj", "Extra"],
            }
        )
        p = build_system_prompt(_ctx(), mem)
        assert "1,234.50" in p
        assert "Saturday" in p
        assert "Sunday" in p
        # top_merchants truncated to 5
        assert "Bhatbhateni" in p
        assert "Extra" not in p

    def test_financial_personality_rendered(self):
        p = build_system_prompt(_ctx(), UserMemory(financial_personality="frugal_saver"))
        assert "frugal_saver" in p

    def test_conversation_summary_rendered(self):
        p = build_system_prompt(_ctx(), UserMemory(conversation_summary="User loves momos."))
        assert "User loves momos." in p

    def test_category_list_rendered(self):
        p = build_system_prompt(_ctx(category_list=["Food", "Travel", "Utilities"]), UserMemory())
        assert "Food" in p
        assert "Travel" in p

    def test_no_budget_section_when_empty(self):
        p = build_system_prompt(_ctx(), UserMemory())
        assert "ACTIVE BUDGETS" not in p

    def test_tool_usage_rules_present(self):
        """Critical rules that drive hybrid AI behavior — don't drop these silently."""
        p = build_system_prompt(_ctx(), UserMemory())
        assert "create_expense" in p
        assert "create_income" in p
        assert "update_expense" in p
        assert "delete_expense" in p


class TestBuildMessages:
    def test_system_first_then_history_then_user(self):
        msgs = build_messages(
            "SYS",
            [
                {"role": "user", "content": "hi"},
                {"role": "assistant", "content": "hello!"},
            ],
            "new question",
        )
        assert msgs[0] == {"role": "system", "content": "SYS"}
        assert msgs[1] == {"role": "user", "content": "hi"}
        assert msgs[2] == {"role": "assistant", "content": "hello!"}
        assert msgs[3] == {"role": "user", "content": "new question"}

    def test_empty_history_still_works(self):
        msgs = build_messages("SYS", [], "hi")
        assert len(msgs) == 2
        assert msgs[0]["role"] == "system"
        assert msgs[1]["role"] == "user"
