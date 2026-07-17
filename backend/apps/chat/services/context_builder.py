"""Build rich financial context for AI requests."""

import logging
from datetime import date
from decimal import Decimal

from django.db.models import Count, Q, Sum  # type: ignore

logger = logging.getLogger(__name__)


def build_user_context(user) -> dict:
    """Build comprehensive financial context for the AI.

    Queries the user's financial data to provide the AI with
    a complete picture of their current financial situation.
    """
    from apps.budgets.models import Budget  # type: ignore
    from apps.categories.models import Category  # type: ignore
    from apps.expenses.models import Expense, Income  # type: ignore

    today = date.today()
    first_of_month = today.replace(day=1)

    # Monthly totals
    expenses_this_month = Expense.objects.filter(
        user=user,
        is_deleted=False,
        date__gte=first_of_month,
        date__lte=today,
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    income_this_month = Income.objects.filter(
        user=user,
        is_deleted=False,
        date__gte=first_of_month,
        date__lte=today,
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    savings_rate = 0.0
    if income_this_month > 0:
        savings_rate = float((income_this_month - expenses_this_month) / income_this_month * 100)

    # Active budgets
    active_budgets = []
    for budget in Budget.objects.filter(user=user, is_active=True).select_related("category"):
        spent = budget.spent or Decimal("0")
        active_budgets.append(
            {
                "name": budget.name,
                "category": budget.category.name if budget.category else "",
                "amount": float(budget.amount),
                "spent": float(spent),
                "remaining": float(budget.remaining),
                "percentage_used": float(budget.percentage_used),
            }
        )

    # Top spending categories this month
    top_cats = (
        Expense.objects.filter(
            user=user,
            is_deleted=False,
            date__gte=first_of_month,
        )
        .values("category__name")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")[:5]
    )
    top_categories = [
        {
            "name": c["category__name"] or "Uncategorized",
            "total": float(c["total"]),
            "count": c["count"],
        }
        for c in top_cats
    ]

    # Recent transactions (last 15 — expenses and incomes mixed)
    recent_expenses = list(
        Expense.objects.filter(user=user, is_deleted=False)
        .select_related("category")
        .order_by("-date", "-created_at")[:10]
    )
    recent_incomes = list(
        Income.objects.filter(user=user, is_deleted=False)
        .select_related("category")
        .order_by("-date", "-created_at")[:5]
    )

    recent_transactions = []
    for exp in recent_expenses:
        recent_transactions.append(
            {
                "id": exp.id,
                "type": "expense",
                "description": exp.description,
                "merchant": exp.merchant,
                "source_name": "",
                "amount": float(exp.amount),
                "category": exp.category.name if exp.category else "",
                "date": exp.date.isoformat(),
            }
        )
    for inc in recent_incomes:
        recent_transactions.append(
            {
                "id": inc.id,
                "type": "income",
                "description": inc.description,
                "merchant": "",
                "source_name": inc.source_name,
                "amount": float(inc.amount),
                "category": inc.category.name if inc.category else "",
                "date": inc.date.isoformat(),
            }
        )

    # Sort by date descending
    recent_transactions.sort(key=lambda x: x["date"], reverse=True)

    # Available category names — system categories (user=None) + this user's own categories only.
    # Never expose custom categories belonging to other users (prevents hallucinations).
    category_list = list(
        Category.objects.filter(type="expense")
        .filter(Q(user__isnull=True) | Q(user=user))
        .values_list("name", flat=True)
        .distinct()
    )

    return {
        "user_id": user.id,
        "first_name": user.first_name,
        "preferred_currency": user.preferred_currency,
        "total_income_this_month": float(income_this_month),
        "total_expenses_this_month": float(expenses_this_month),
        "savings_rate": savings_rate,
        "active_budgets": active_budgets,
        "top_categories": top_categories,
        "recent_transactions": recent_transactions[:15],
        "category_list": category_list,
    }


def build_user_memory(user) -> dict:
    """Build the user's AI memory context.

    Returns the UserAIMemory data if it exists, otherwise empty defaults.
    """
    try:
        memory = user.ai_memory
        return {
            "financial_personality": memory.financial_personality,
            "facts": memory.facts or [],
            "goals": memory.goals or [],
            "spending_patterns": memory.spending_patterns or {},
            "conversation_summary": memory.conversation_summary,
        }
    except Exception:
        # No AI memory yet — return empty
        return {
            "financial_personality": "",
            "facts": [],
            "goals": [],
            "spending_patterns": {},
            "conversation_summary": "",
        }
