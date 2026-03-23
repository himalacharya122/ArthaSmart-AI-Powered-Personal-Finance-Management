"""Generate financial insights using statistical analysis + LLM interpretation."""

from __future__ import annotations

import json
import logging
import time

from app.config import get_settings
from app.schemas.insights import (
    InsightItem,
    InsightRequest,
    InsightResponse,
)
from app.services.groq_client import get_groq_client

logger = logging.getLogger(__name__)


def generate_insights(request: InsightRequest) -> InsightResponse:
    """Analyze user's financial data and generate actionable insights.

    Uses a combination of statistical analysis + LLM interpretation.
    """
    start = time.perf_counter()
    insights: list[InsightItem] = []
    total_tokens = 0

    # 1. Statistical insights (no LLM needed)
    insights.extend(_statistical_insights(request))

    # 2. Budget predictions
    insights.extend(_budget_predictions(request))

    # 3. LLM-powered deeper analysis
    llm_insights, tokens = _llm_analysis(request)
    insights.extend(llm_insights)
    total_tokens += tokens

    elapsed = int((time.perf_counter() - start) * 1000)

    return InsightResponse(
        insights=insights,
        tokens_used=total_tokens,
        response_time_ms=elapsed,
    )


def _statistical_insights(req: InsightRequest) -> list[InsightItem]:
    """Generate insights from pure statistical analysis."""
    insights = []
    currency = req.preferred_currency

    # Savings rate insight
    if req.savings_rate > 50:
        insights.append(InsightItem(
            insight_type="spending_pattern",
            severity="info",
            title="Excellent Savings Rate!",
            description=f"Your savings rate of {req.savings_rate:.1f}% is outstanding. "
                        f"You're saving {currency} {req.total_income_this_month - req.total_expenses_this_month:,.0f} this month.",
            data={"savings_rate": req.savings_rate},
        ))
    elif req.savings_rate < 10 and req.total_income_this_month > 0:
        insights.append(InsightItem(
            insight_type="suggestion",
            severity="warning",
            title="Low Savings Rate",
            description=f"Your savings rate is only {req.savings_rate:.1f}%. Try to aim for at least 20% "
                        f"by reviewing your top spending categories.",
            data={"savings_rate": req.savings_rate},
        ))

    # Top category dominance
    if req.categories and req.total_expenses_this_month > 0:
        top = req.categories[0]
        pct = (top.total / req.total_expenses_this_month) * 100
        if pct > 40:
            insights.append(InsightItem(
                insight_type="spending_pattern",
                severity="info",
                title=f"{top.name} Dominates Your Spending",
                description=f"{top.name} accounts for {pct:.0f}% of your total expenses "
                            f"({currency} {top.total:,.0f} across {top.count} transactions).",
                data={"category": top.name, "percentage": pct, "total": top.total},
            ))

    # Month-over-month trend
    if len(req.monthly_history) >= 2:
        current = req.monthly_history[-1]
        previous = req.monthly_history[-2]
        if previous.expense > 0:
            change_pct = ((current.expense - previous.expense) / previous.expense) * 100
            if change_pct > 25:
                insights.append(InsightItem(
                    insight_type="spending_pattern",
                    severity="warning",
                    title="Spending Increase Detected",
                    description=f"Your expenses increased by {change_pct:.0f}% compared to last month "
                                f"({currency} {current.expense:,.0f} vs {currency} {previous.expense:,.0f}).",
                    data={"change_percent": change_pct},
                ))
            elif change_pct < -15:
                insights.append(InsightItem(
                    insight_type="spending_pattern",
                    severity="info",
                    title="Great Spending Reduction!",
                    description=f"You've reduced spending by {abs(change_pct):.0f}% compared to last month. Keep it up!",
                    data={"change_percent": change_pct},
                ))

    return insights


def _budget_predictions(req: InsightRequest) -> list[InsightItem]:
    """Predict budget outcomes based on current spending rate."""
    insights = []
    currency = req.preferred_currency

    from datetime import date
    today = date.today()
    days_in_month = 30
    days_elapsed = today.day
    days_remaining = days_in_month - days_elapsed

    for budget in req.active_budgets:
        amount = budget.get("amount", 0)
        spent = budget.get("spent", 0)
        name = budget.get("name", "Unknown")

        if days_elapsed < 3 or amount <= 0:
            continue

        daily_rate = spent / days_elapsed
        predicted_total = spent + (daily_rate * days_remaining)
        pct_used = budget.get("percentage_used", 0)

        if predicted_total > amount and pct_used < 100:
            overspend = predicted_total - amount
            insights.append(InsightItem(
                insight_type="prediction",
                severity="warning",
                title=f"{name}: Overspend Predicted",
                description=f"At your current rate of {currency} {daily_rate:,.0f}/day, "
                            f"you'll exceed {name} by {currency} {overspend:,.0f} this month.",
                data={
                    "budget": name,
                    "predicted_total": predicted_total,
                    "limit": amount,
                    "overspend": overspend,
                    "daily_rate": daily_rate,
                },
            ))
        elif pct_used >= 80 and pct_used < 100:
            insights.append(InsightItem(
                insight_type="prediction",
                severity="warning",
                title=f"{name}: Getting Close",
                description=f"You've used {pct_used:.0f}% of your {name} budget with {days_remaining} days left.",
                data={"budget": name, "percentage_used": pct_used, "days_remaining": days_remaining},
            ))

    return insights


def _llm_analysis(req: InsightRequest) -> tuple[list[InsightItem], int]:
    """Use LLM for deeper financial analysis and personalized suggestions."""
    if not req.categories:
        return [], 0

    currency = req.preferred_currency
    prompt = f"""Analyze this user's financial situation and provide 2-3 actionable, personalized insights.

User: {req.first_name}
Currency: {currency}
Income this month: {currency} {req.total_income_this_month:,.2f}
Expenses this month: {currency} {req.total_expenses_this_month:,.2f}
Savings rate: {req.savings_rate:.1f}%

Top spending categories:
{chr(10).join(f'- {c.name}: {currency} {c.total:,.2f} ({c.count} transactions, avg {currency} {c.avg_per_transaction:,.2f})' for c in req.categories[:5])}

Active budgets:
{chr(10).join(f'- {b.get("name")}: {currency} {b.get("spent", 0):,.2f} / {currency} {b.get("amount", 0):,.2f} ({b.get("percentage_used", 0):.0f}% used)' for b in req.active_budgets[:5])}

Monthly history (recent months):
{chr(10).join(f'- {m.month}: Income {currency} {m.income:,.2f}, Expenses {currency} {m.expense:,.2f}' for m in req.monthly_history[-3:])}

Return ONLY a JSON array of insights, each with: type (one of: spending_pattern, suggestion, prediction), severity (info/warning), title (short), description (1-2 sentences, actionable).

Example format:
[{{"type": "suggestion", "severity": "info", "title": "Cut Dining Costs", "description": "You spend X on dining. Cooking at home 3x/week could save Y."}}]
"""

    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=get_settings().llm_model,
            messages=[
                {"role": "system", "content": "You are a financial analyst. Return only valid JSON arrays. No markdown, no code blocks."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=600,
            temperature=0.6,
        )

        content = response.choices[0].message.content or "[]"
        tokens = response.usage.total_tokens if response.usage else 0

        # Clean up potential markdown wrapping
        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        raw_insights = json.loads(content)
        insights = []
        for item in raw_insights[:3]:  # Max 3 LLM insights
            insights.append(InsightItem(
                insight_type=item.get("type", "suggestion"),
                severity=item.get("severity", "info"),
                title=item.get("title", "Financial Insight"),
                description=item.get("description", ""),
                data={},
            ))

        return insights, tokens

    except Exception as exc:
        logger.warning("LLM insight analysis failed: %s", exc)
        return [], 0
