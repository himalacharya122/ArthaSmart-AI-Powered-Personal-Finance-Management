"""Tests for the insight engine.

Hybrid pipeline: (1) rule-based statistical insights, (2) budget
predictions, (3) LLM interpretation on top. The rules must fire on the
right thresholds, the LLM must be called only when there's data, and
malformed LLM output must never kill the whole request.
"""

from __future__ import annotations

from app.schemas.insights import (
    CategorySpending,
    InsightRequest,
    MonthlyTotal,
)
from app.services.insight_engine import generate_insights


def _req(**overrides) -> InsightRequest:
    base = {
        "user_id": 1,
        "first_name": "Himal",
        "preferred_currency": "NPR",
        "total_income_this_month": 0.0,
        "total_expenses_this_month": 0.0,
        "savings_rate": 30.0,
        "categories": [],
        "monthly_history": [],
        "active_budgets": [],
    }
    base.update(overrides)
    return InsightRequest(**base)


class TestSavingsRate:
    def test_high_savings_rate_gets_praise(self, mock_groq_raw):
        r = generate_insights(
            _req(
                savings_rate=60.0,
                total_income_this_month=50000,
                total_expenses_this_month=20000,
            )
        )
        titles = [i.title for i in r.insights]
        assert any("Excellent" in t for t in titles)

    def test_low_savings_rate_gets_warning(self, mock_groq_raw):
        r = generate_insights(
            _req(
                savings_rate=5.0,
                total_income_this_month=50000,
                total_expenses_this_month=47000,
            )
        )
        titles = [i.title for i in r.insights]
        assert any("Low Savings" in t for t in titles)

    def test_low_savings_but_no_income_is_not_flagged(self, mock_groq_raw):
        """If income is 0, we don't call low-savings out — nothing to save from."""
        r = generate_insights(_req(savings_rate=0.0, total_income_this_month=0))
        titles = [i.title for i in r.insights]
        assert not any("Low Savings" in t for t in titles)


class TestCategoryDominance:
    def test_top_category_over_40_percent_flagged(self, mock_groq_raw):
        cats = [
            CategorySpending(name="Food", total=6000, count=20, avg_per_transaction=300),
            CategorySpending(name="Travel", total=2000, count=5, avg_per_transaction=400),
        ]
        r = generate_insights(
            _req(
                total_expenses_this_month=10000,
                categories=cats,
            )
        )
        titles = [i.title for i in r.insights]
        assert any("Food Dominates" in t for t in titles)

    def test_top_category_below_40_not_flagged(self, mock_groq_raw):
        cats = [
            CategorySpending(name="Food", total=3000, count=10, avg_per_transaction=300),
        ]
        r = generate_insights(_req(total_expenses_this_month=10000, categories=cats))
        titles = [i.title for i in r.insights]
        assert not any("Dominates" in t for t in titles)


class TestMonthlyTrend:
    def test_big_increase_flagged_as_warning(self, mock_groq_raw):
        history = [
            MonthlyTotal(month="2025-11", income=50000, expense=10000),
            MonthlyTotal(month="2025-12", income=50000, expense=15000),  # +50%
        ]
        r = generate_insights(_req(monthly_history=history))
        titles = [i.title for i in r.insights]
        assert any("Increase" in t for t in titles)

    def test_big_decrease_flagged_as_praise(self, mock_groq_raw):
        history = [
            MonthlyTotal(month="2025-11", income=50000, expense=20000),
            MonthlyTotal(month="2025-12", income=50000, expense=15000),  # -25%
        ]
        r = generate_insights(_req(monthly_history=history))
        titles = [i.title for i in r.insights]
        assert any("Reduction" in t for t in titles)

    def test_small_change_not_flagged(self, mock_groq_raw):
        history = [
            MonthlyTotal(month="2025-11", income=50000, expense=10000),
            MonthlyTotal(month="2025-12", income=50000, expense=10500),  # +5%
        ]
        r = generate_insights(_req(monthly_history=history))
        titles = [i.title for i in r.insights]
        assert not any("Increase" in t or "Reduction" in t for t in titles)


class TestBudgetPredictions:
    def test_early_month_skips_prediction(self, mock_groq_raw, monkeypatch):
        """Day 1/2 of month — too little data for a prediction."""
        import datetime as _dt

        class FakeDate(_dt.date):
            @classmethod
            def today(cls):
                return _dt.date(2025, 1, 2)  # day 2

        monkeypatch.setattr("datetime.date", FakeDate)
        budgets = [{"name": "Food", "amount": 1000, "spent": 200, "percentage_used": 20}]
        r = generate_insights(_req(active_budgets=budgets))
        titles = [i.title for i in r.insights]
        assert not any("Overspend" in t or "Getting Close" in t for t in titles)

    def test_overspend_predicted(self, mock_groq_raw, monkeypatch):
        import datetime as _dt

        class FakeDate(_dt.date):
            @classmethod
            def today(cls):
                return _dt.date(2025, 1, 15)  # mid-month

        monkeypatch.setattr("datetime.date", FakeDate)
        # 15 days in, spent 800 of 1000 — at that rate final would be ~1600
        budgets = [{"name": "Food", "amount": 1000, "spent": 800, "percentage_used": 80}]
        r = generate_insights(_req(active_budgets=budgets))
        titles = [i.title for i in r.insights]
        assert any("Overspend" in t for t in titles)

    def test_getting_close_fires_at_80_99_percent(self, mock_groq_raw, monkeypatch):
        import datetime as _dt

        class FakeDate(_dt.date):
            @classmethod
            def today(cls):
                return _dt.date(2025, 1, 28)  # near end of month

        monkeypatch.setattr("datetime.date", FakeDate)
        # Late month so rate extrapolation won't overshoot much; pct_used in 80-100 range
        budgets = [{"name": "Food", "amount": 1000, "spent": 850, "percentage_used": 85}]
        r = generate_insights(_req(active_budgets=budgets))
        titles = [i.title for i in r.insights]
        assert any("Getting Close" in t for t in titles)


class TestLLMAnalysis:
    def test_no_categories_skips_llm(self, mock_groq_raw):
        generate_insights(_req(categories=[]))
        mock_groq_raw.chat.completions.create.assert_not_called()

    def test_llm_results_capped_at_3(self, mock_groq_raw, openai_response_factory):
        payload = (
            "["
            + ",".join(
                f'{{"type":"suggestion","severity":"info","title":"T{i}","description":"D{i}"}}'
                for i in range(10)
            )
            + "]"
        )
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            payload, tokens=80
        )
        cats = [CategorySpending(name="Food", total=100, count=1, avg_per_transaction=100)]
        r = generate_insights(_req(categories=cats))
        llm_titles = [i.title for i in r.insights if i.title.startswith("T")]
        assert len(llm_titles) == 3

    def test_markdown_wrapped_json_is_parsed(self, mock_groq_raw, openai_response_factory):
        fenced = (
            "```json\n"
            '[{"type":"suggestion","severity":"info","title":"Hi","description":"There"}]\n'
            "```"
        )
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            fenced, tokens=30
        )
        cats = [CategorySpending(name="Food", total=100, count=1, avg_per_transaction=100)]
        r = generate_insights(_req(categories=cats))
        assert any(i.title == "Hi" for i in r.insights)
        assert r.tokens_used == 30

    def test_llm_exception_does_not_propagate(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("boom")
        cats = [CategorySpending(name="Food", total=100, count=1, avg_per_transaction=100)]
        r = generate_insights(_req(categories=cats))
        # Statistical + budget insights may be empty but the call must not raise
        assert r.tokens_used == 0
