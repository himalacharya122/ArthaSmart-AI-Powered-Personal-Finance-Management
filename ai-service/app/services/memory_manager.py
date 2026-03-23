"""Analyze spending patterns and update user memory/personality."""

from __future__ import annotations

import json
import logging
import time

from app.config import get_settings
from app.schemas.insights import MemoryUpdateRequest, MemoryUpdateResponse
from app.services.groq_client import get_groq_client

logger = logging.getLogger(__name__)


def analyze_and_update_memory(request: MemoryUpdateRequest) -> MemoryUpdateResponse:
    """Analyze 30-day spending data and generate memory updates.

    This is called periodically (weekly) to build the user's financial profile.
    """
    start = time.perf_counter()

    # --- Statistical patterns ---
    patterns = _calculate_patterns(request)

    # --- LLM personality analysis ---
    personality, new_facts, summary, tokens = _llm_personality_analysis(request, patterns)

    elapsed = int((time.perf_counter() - start) * 1000)

    return MemoryUpdateResponse(
        financial_personality=personality,
        spending_patterns=patterns,
        new_facts=new_facts,
        conversation_summary=summary,
        tokens_used=tokens,
    )


def _calculate_patterns(req: MemoryUpdateRequest) -> dict:
    """Calculate statistical spending patterns from 30-day data."""
    patterns: dict = {}

    # Average daily spend
    if req.daily_expenses:
        totals = [d.get("total", 0) for d in req.daily_expenses if d.get("total", 0) > 0]
        if totals:
            patterns["avg_daily_spend"] = sum(totals) / len(totals)
            patterns["max_daily_spend"] = max(totals)
            patterns["min_daily_spend"] = min(totals)
            patterns["spending_days"] = len(totals)

    # Top merchants
    if req.top_merchants:
        patterns["top_merchants"] = [m.get("name", "") for m in req.top_merchants[:5]]
        patterns["merchant_frequency"] = {
            m.get("name", ""): m.get("count", 0) for m in req.top_merchants[:5]
        }

    # Category preferences (by percentage)
    if req.categories and req.total_expenses_30d > 0:
        cat_pcts = {}
        for c in req.categories:
            cat_pcts[c.name] = round((c.total / req.total_expenses_30d) * 100, 1)
        patterns["category_distribution"] = cat_pcts

    # Peak spending days (by day of week)
    if req.daily_expenses:
        from datetime import datetime
        day_totals: dict[str, list[float]] = {}
        for d in req.daily_expenses:
            try:
                dt = datetime.strptime(d.get("date", ""), "%Y-%m-%d")
                day_name = dt.strftime("%A")
                if day_name not in day_totals:
                    day_totals[day_name] = []
                day_totals[day_name].append(d.get("total", 0))
            except (ValueError, TypeError):
                continue

        if day_totals:
            day_avgs = {day: sum(vals) / len(vals) for day, vals in day_totals.items()}
            sorted_days = sorted(day_avgs.items(), key=lambda x: x[1], reverse=True)
            patterns["peak_spending_days"] = [d[0] for d in sorted_days[:3]]

    return patterns


def _llm_personality_analysis(
    req: MemoryUpdateRequest, patterns: dict
) -> tuple[str, list[str], str, int]:
    """Use LLM to determine financial personality and extract insights."""
    currency = req.preferred_currency
    income = req.total_income_30d
    expenses = req.total_expenses_30d
    savings_rate = ((income - expenses) / income * 100) if income > 0 else 0

    prompt = f"""Analyze this user's 30-day financial behavior and determine their profile.

User: {req.first_name}
Currency: {currency}
30-day income: {currency} {income:,.2f}
30-day expenses: {currency} {expenses:,.2f}
Savings rate: {savings_rate:.1f}%

Spending patterns:
- Average daily spend: {currency} {patterns.get('avg_daily_spend', 0):,.2f}
- Peak spending days: {', '.join(patterns.get('peak_spending_days', ['unknown']))}
- Top merchants: {', '.join(patterns.get('top_merchants', ['none']))}

Categories:
{chr(10).join(f'- {c.name}: {currency} {c.total:,.2f} ({c.count} transactions)' for c in req.categories[:8])}

Existing memory:
{json.dumps(req.existing_memory, default=str, indent=2)[:500]}

Return JSON with:
- "personality": one of "frugal_saver", "balanced", "moderate_spender", "impulsive_spender", "planned_spender"
- "facts": list of 2-4 NEW behavioral observations (only if truly new/interesting, not repeating existing memory)
- "summary": 1-2 sentence personality summary for future AI conversations

Example:
{{"personality": "balanced", "facts": ["Spends most on weekends", "Regular salary on 1st"], "summary": "A balanced spender who controls impulse purchases but enjoys occasional treats."}}
"""

    try:
        client = get_groq_client()
        response = client.chat.completions.create(
            model=get_settings().llm_model,
            messages=[
                {"role": "system", "content": "You are a financial behavior analyst. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=400,
            temperature=0.5,
        )

        content = response.choices[0].message.content or "{}"
        tokens = response.usage.total_tokens if response.usage else 0

        content = content.strip()
        if content.startswith("```"):
            content = content.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        data = json.loads(content)

        return (
            data.get("personality", "balanced"),
            data.get("facts", [])[:5],  # Max 5 new facts
            data.get("summary", ""),
            tokens,
        )

    except Exception as exc:
        logger.warning("LLM personality analysis failed: %s", exc)
        # Fallback: determine from savings rate
        if savings_rate > 40:
            personality = "frugal_saver"
        elif savings_rate > 15:
            personality = "balanced"
        else:
            personality = "moderate_spender"
        return personality, [], "", 0
