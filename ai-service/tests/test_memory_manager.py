"""Tests for the memory manager.

The statistical `_calculate_patterns` is pure logic — deterministic
aggregations over daily_expenses/top_merchants/categories. The LLM
branch has a savings-rate fallback when the call fails.
"""

from __future__ import annotations

from app.schemas.insights import CategorySpending, MemoryUpdateRequest
from app.services.memory_manager import analyze_and_update_memory


def _req(**overrides) -> MemoryUpdateRequest:
    base = {
        "user_id": 1,
        "first_name": "Himal",
        "preferred_currency": "NPR",
        "total_income_30d": 0.0,
        "total_expenses_30d": 0.0,
        "categories": [],
        "daily_expenses": [],
        "top_merchants": [],
    }
    base.update(overrides)
    return MemoryUpdateRequest(**base)


class TestStatisticalPatterns:
    def test_avg_daily_spend_from_daily_expenses(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("skip llm")
        daily = [
            {"date": "2025-01-01", "total": 100},
            {"date": "2025-01-02", "total": 200},
            {"date": "2025-01-03", "total": 300},
        ]
        r = analyze_and_update_memory(_req(daily_expenses=daily))
        assert r.spending_patterns["avg_daily_spend"] == 200.0
        assert r.spending_patterns["max_daily_spend"] == 300.0
        assert r.spending_patterns["min_daily_spend"] == 100.0
        assert r.spending_patterns["spending_days"] == 3

    def test_zero_total_days_are_excluded(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("skip llm")
        daily = [
            {"date": "2025-01-01", "total": 0},
            {"date": "2025-01-02", "total": 200},
        ]
        r = analyze_and_update_memory(_req(daily_expenses=daily))
        assert r.spending_patterns["avg_daily_spend"] == 200.0
        assert r.spending_patterns["spending_days"] == 1

    def test_top_merchants_limited_to_5(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("skip llm")
        merchants = [{"name": f"M{i}", "count": i} for i in range(8)]
        r = analyze_and_update_memory(_req(top_merchants=merchants))
        assert len(r.spending_patterns["top_merchants"]) == 5

    def test_category_distribution_percentages(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("skip llm")
        cats = [
            CategorySpending(name="Food", total=600, count=10, avg_per_transaction=60),
            CategorySpending(name="Travel", total=400, count=5, avg_per_transaction=80),
        ]
        r = analyze_and_update_memory(_req(total_expenses_30d=1000, categories=cats))
        dist = r.spending_patterns["category_distribution"]
        assert dist["Food"] == 60.0
        assert dist["Travel"] == 40.0

    def test_peak_spending_days_sorted_top_3(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("skip llm")
        # 2025-01-04 is a Saturday — make it the highest spend day
        daily = [
            {"date": "2025-01-04", "total": 1000},  # Sat
            {"date": "2025-01-05", "total": 500},  # Sun
            {"date": "2025-01-06", "total": 100},  # Mon
            {"date": "2025-01-07", "total": 50},  # Tue
        ]
        r = analyze_and_update_memory(_req(daily_expenses=daily))
        peaks = r.spending_patterns["peak_spending_days"]
        assert len(peaks) == 3
        assert peaks[0] == "Saturday"

    def test_malformed_dates_are_skipped(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("skip llm")
        daily = [
            {"date": "not-a-date", "total": 1000},
            {"date": "2025-01-04", "total": 500},  # Saturday
        ]
        r = analyze_and_update_memory(_req(daily_expenses=daily))
        # Only Saturday should remain
        assert r.spending_patterns["peak_spending_days"] == ["Saturday"]


class TestLLMPersonalityFallback:
    """When the LLM fails, personality is derived from savings rate."""

    def test_high_savings_falls_back_to_frugal_saver(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("boom")
        r = analyze_and_update_memory(
            _req(total_income_30d=10000, total_expenses_30d=4000)  # 60% savings
        )
        assert r.financial_personality == "frugal_saver"
        assert r.tokens_used == 0

    def test_mid_savings_falls_back_to_balanced(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("boom")
        r = analyze_and_update_memory(
            _req(total_income_30d=10000, total_expenses_30d=7500)  # 25%
        )
        assert r.financial_personality == "balanced"

    def test_low_savings_falls_back_to_moderate_spender(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("boom")
        r = analyze_and_update_memory(
            _req(total_income_30d=10000, total_expenses_30d=9500)  # 5%
        )
        assert r.financial_personality == "moderate_spender"


class TestLLMPersonalitySuccess:
    def test_llm_result_used_when_call_succeeds(self, mock_groq_raw, openai_response_factory):
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            '{"personality": "planned_spender", "facts": ["F1", "F2"], "summary": "S"}',
            tokens=77,
        )
        r = analyze_and_update_memory(_req(total_income_30d=10000, total_expenses_30d=5000))
        assert r.financial_personality == "planned_spender"
        assert r.new_facts == ["F1", "F2"]
        assert r.conversation_summary == "S"
        assert r.tokens_used == 77

    def test_facts_capped_at_5(self, mock_groq_raw, openai_response_factory):
        facts = [f"F{i}" for i in range(10)]
        import json as _json

        payload = _json.dumps({"personality": "balanced", "facts": facts, "summary": ""})
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            payload, tokens=50
        )
        r = analyze_and_update_memory(_req())
        assert len(r.new_facts) == 5

    def test_markdown_fenced_json_is_unwrapped(self, mock_groq_raw, openai_response_factory):
        fenced = '```json\n{"personality": "balanced", "facts": [], "summary": "ok"}\n```'
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            fenced, tokens=20
        )
        r = analyze_and_update_memory(_req())
        assert r.financial_personality == "balanced"
        assert r.conversation_summary == "ok"
