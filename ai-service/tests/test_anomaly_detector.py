"""Tests for the anomaly detector — the statistical+LLM hybrid layer.

The rule engine runs first (z-score, pattern, above-avg). Only when it
triggers does the LLM get called. Tests verify each branch fires
correctly, the LLM is called *only* when expected, and malformed LLM
output doesn't blow anything up.
"""

from __future__ import annotations

from app.schemas.insights import AnomalyCheckRequest
from app.services.anomaly_detector import check_anomaly


def _req(**overrides) -> AnomalyCheckRequest:
    base = {
        "expense_amount": 100.0,
        "expense_category": "Food",
        "expense_merchant": "",
        "expense_description": "",
        "preferred_currency": "NPR",
        "category_avg": 100.0,
        "category_std": 20.0,
        "category_count": 10,
        "recent_category_expenses": [100.0, 110.0, 90.0, 105.0, 95.0],
    }
    base.update(overrides)
    return AnomalyCheckRequest(**base)


class TestStatisticalBranch:
    def test_normal_expense_is_not_anomaly(self, mock_groq_raw):
        """Expense within 2 stddev — not flagged, LLM untouched."""
        r = check_anomaly(_req(expense_amount=105.0))
        assert r.is_anomaly is False
        assert r.tokens_used == 0
        mock_groq_raw.chat.completions.create.assert_not_called()

    def test_insufficient_sample_skips_zscore(self, mock_groq_raw):
        """category_count < 3 → no statistical flag."""
        r = check_anomaly(
            _req(
                expense_amount=1_000_000.0,
                category_count=2,
                category_std=0.0,
                recent_category_expenses=[],
            )
        )
        # With no std and count<3, z is skipped. Above-avg fires but only 0.4.
        assert r.is_anomaly is False

    def test_zero_std_skips_zscore(self, mock_groq_raw):
        r = check_anomaly(_req(expense_amount=200.0, category_std=0.0, recent_category_expenses=[]))
        # still caught by 2.5x above-avg rule (200 = 2x, not enough)
        assert r.is_anomaly is False


class TestPatternBranch:
    def test_3x_recent_avg_flags_with_llm(self, mock_groq_raw, openai_response_factory):
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            '{"reason": "3x pattern", "suggestion": "verify"}', tokens=55
        )
        # recent avg = 100, expense = 400 → pattern anomaly
        r = check_anomaly(_req(expense_amount=400.0, category_std=0.0, category_avg=0.0))
        assert r.is_anomaly is True
        assert r.reason == "3x pattern"
        assert r.suggestion == "verify"
        assert r.tokens_used == 55

    def test_fewer_than_3_recent_skips_pattern(self, mock_groq_raw):
        r = check_anomaly(
            _req(
                expense_amount=1000.0,
                recent_category_expenses=[100.0, 100.0],
                category_std=0.0,
                category_avg=0.0,
            )
        )
        assert r.is_anomaly is False


class TestAboveAvgBranch:
    def test_2_5x_avg_alone_is_not_enough(self, mock_groq_raw):
        """Above-avg contributes 0.4 — below the 0.5 threshold."""
        r = check_anomaly(
            _req(
                expense_amount=260.0,  # 2.6x of 100
                category_std=0.0,
                recent_category_expenses=[],
            )
        )
        assert r.is_anomaly is False
        assert r.confidence == 0.4


class TestCombinedConfidence:
    def test_high_zscore_triggers_anomaly(self, mock_groq_raw, openai_response_factory):
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            '{"reason": "huge outlier", "suggestion": "double-check"}', tokens=40
        )
        # avg=100, std=20, amt=200 → z=5 → confidence = min(0.5 + 3*0.15, 0.9) = 0.9
        r = check_anomaly(_req(expense_amount=200.0))
        assert r.is_anomaly is True
        assert r.confidence == 0.9
        assert r.reason == "huge outlier"


class TestLLMOutputHandling:
    def test_markdown_fenced_json_is_parsed(self, mock_groq_raw, openai_response_factory):
        fenced = '```json\n{"reason": "wrapped", "suggestion": "ok"}\n```'
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            fenced, tokens=30
        )
        r = check_anomaly(_req(expense_amount=200.0))
        assert r.reason == "wrapped"
        assert r.suggestion == "ok"

    def test_llm_exception_falls_back_gracefully(self, mock_groq_raw):
        mock_groq_raw.chat.completions.create.side_effect = RuntimeError("boom")
        r = check_anomaly(_req(expense_amount=200.0))
        assert r.is_anomaly is True
        assert r.reason  # non-empty fallback reason
        assert r.suggestion
        assert r.tokens_used == 0

    def test_llm_missing_keys_use_defaults(self, mock_groq_raw, openai_response_factory):
        mock_groq_raw.chat.completions.create.return_value = openai_response_factory(
            "{}", tokens=10
        )
        r = check_anomaly(_req(expense_amount=200.0))
        # Defaults come from anomaly_detector fallback strings
        assert "above your category average" in r.reason
        assert "Review" in r.suggestion
