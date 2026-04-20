"""Anomaly detection using statistical analysis + LLM interpretation."""

from __future__ import annotations

import logging

from app.config import get_settings
from app.schemas.insights import AnomalyCheckRequest, AnomalyCheckResponse
from app.services.groq_client import get_groq_client

logger = logging.getLogger(__name__)


def check_anomaly(request: AnomalyCheckRequest) -> AnomalyCheckResponse:
    """Determine if an expense is anomalous using a hybrid approach.

    1. Statistical: z-score analysis against category average
    2. Pattern: compare against recent category expenses
    3. LLM: nuanced interpretation of flagged items
    """
    # Statistical check
    z_score = 0.0
    is_stat_anomaly = False

    if request.category_std > 0 and request.category_count >= 3:
        z_score = (request.expense_amount - request.category_avg) / request.category_std
        is_stat_anomaly = z_score > 2.0  # More than 2 standard deviations

    # Pattern check
    is_pattern_anomaly = False
    if request.recent_category_expenses and len(request.recent_category_expenses) >= 3:
        avg_recent = sum(request.recent_category_expenses) / len(request.recent_category_expenses)
        if avg_recent > 0 and request.expense_amount > (avg_recent * 3):
            is_pattern_anomaly = True

    # Simple check: is it significantly above average?
    is_above_avg = False
    if request.category_avg > 0 and request.expense_amount > (request.category_avg * 2.5):
        is_above_avg = True

    # Calculate combined confidence
    confidence = 0.0
    if is_stat_anomaly:
        confidence = min(0.5 + (z_score - 2.0) * 0.15, 0.9)
    if is_pattern_anomaly:
        confidence = max(confidence, 0.6)
    if is_above_avg:
        confidence = max(confidence, 0.4)

    is_anomaly = confidence >= 0.5

    if not is_anomaly:
        return AnomalyCheckResponse(
            is_anomaly=False,
            confidence=confidence,
            reason="",
            suggestion="",
            tokens_used=0,
        )

    # LLM interpretation for flagged items
    reason, suggestion, tokens = _llm_interpret(request, z_score, confidence)

    return AnomalyCheckResponse(
        is_anomaly=True,
        confidence=confidence,
        reason=reason,
        suggestion=suggestion,
        tokens_used=tokens,
    )


def _llm_interpret(
    req: AnomalyCheckRequest, z_score: float, confidence: float
) -> tuple[str, str, int]:
    """Use LLM for nuanced interpretation of a flagged expense."""
    currency = req.preferred_currency

    prompt = f"""An expense has been flagged as potentially anomalous. Analyze it briefly.

Expense: {currency} {req.expense_amount:,.2f} in {req.expense_category}
Merchant: {req.expense_merchant or 'Unknown'}
Description: {req.expense_description or 'None'}

Category stats:
- Average: {currency} {req.category_avg:,.2f}
- Std deviation: {currency} {req.category_std:,.2f}
- Z-score: {z_score:.1f}
- Total past transactions: {req.category_count}
- Recent amounts in this category: {', '.join(f'{currency} {a:,.2f}' for a in req.recent_category_expenses[-5:])}

Respond in JSON with two fields:
- "reason": 1 sentence explaining why this is unusual
- "suggestion": 1 sentence advice to the user

Example: {{"reason": "This is 3x your usual food spending.", "suggestion": "Check if this was a one-time event or if prices increased."}}
"""

    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=get_settings().llm_model_fallback,  # Use faster model for anomaly checks
            messages=[
                {
                    "role": "system",
                    "content": "You are a financial anomaly analyst. Return only JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            max_tokens=150,
            temperature=0.3,
        )

        import json

        content = response.choices[0].message.content or "{}"
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        data = json.loads(content)
        tokens = response.usage.total_tokens if response.usage else 0

        return (
            data.get("reason", f"This expense is {z_score:.1f}x above your category average."),
            data.get("suggestion", "Review this transaction to make sure it's correct."),
            tokens,
        )

    except Exception as exc:
        logger.warning("LLM anomaly interpretation failed: %s", exc)
        return (
            f"This {req.expense_category} expense of {currency} {req.expense_amount:,.2f} is significantly above your average of {currency} {req.category_avg:,.2f}.",
            "Verify this transaction. If it's a regular expense, your average will adjust over time.",
            0,
        )
