"""Service layer for generating and storing AI insights.

Calls the FastAPI AI service for intelligence, then persists results
in the Django database and creates notifications as needed.
"""

import logging
from datetime import date, timedelta
from decimal import Decimal

import httpx  # type: ignore
from django.conf import settings as django_settings  # type: ignore
from django.db.models import Avg, Count, StdDev, Sum  # type: ignore

from .models import AIInsight

logger = logging.getLogger(__name__)

AI_URL = getattr(django_settings, "AI_SERVICE_URL", "http://localhost:8001")
AI_KEY = getattr(django_settings, "AI_SERVICE_KEY", "artha-ai-service-key-change-in-production")
TIMEOUT = httpx.Timeout(timeout=45.0, connect=5.0)


def generate_insights_for_user(user) -> list[AIInsight]:
    """Generate and store AI insights for a user.

    Called on-demand (from dashboard refresh) or by a periodic task.
    """
    from apps.budgets.models import Budget  # type: ignore
    from apps.expenses.models import Expense, Income  # type: ignore

    today = date.today()
    first_of_month = today.replace(day=1)
    thirty_days_ago = today - timedelta(days=30)

    # Build the request payload
    expenses_month = Expense.objects.filter(
        user=user, is_deleted=False, date__gte=first_of_month,
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    income_month = Income.objects.filter(
        user=user, is_deleted=False, date__gte=first_of_month,
    ).aggregate(total=Sum("amount"))["total"] or Decimal("0")

    savings_rate = 0.0
    if income_month > 0:
        savings_rate = float((income_month - expenses_month) / income_month * 100)

    # Category breakdown
    cat_data = (
        Expense.objects.filter(user=user, is_deleted=False, date__gte=first_of_month)
        .values("category__name")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")[:10]
    )
    categories = []
    for c in cat_data:
        total = float(c["total"] or 0)
        count = c["count"] or 1
        categories.append({
            "name": c["category__name"] or "Uncategorized",
            "total": total,
            "count": count,
            "avg_per_transaction": total / count if count > 0 else 0,
        })

    # Monthly history (last 6 months)
    monthly_history = []
    for i in range(5, -1, -1):
        m_start = (first_of_month - timedelta(days=30 * i)).replace(day=1)
        m_end = (m_start + timedelta(days=32)).replace(day=1) - timedelta(days=1)
        m_exp = float(
            Expense.objects.filter(user=user, is_deleted=False, date__gte=m_start, date__lte=m_end)
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        m_inc = float(
            Income.objects.filter(user=user, is_deleted=False, date__gte=m_start, date__lte=m_end)
            .aggregate(total=Sum("amount"))["total"] or 0
        )
        monthly_history.append({
            "month": m_start.strftime("%Y-%m"),
            "income": m_inc,
            "expense": m_exp,
        })

    # Active budgets
    active_budgets = []
    for b in Budget.objects.filter(user=user, is_active=True).select_related("category"):
        active_budgets.append({
            "name": b.name,
            "category": b.category.name if b.category else "",
            "amount": float(b.amount),
            "spent": float(b.spent or 0),
            "remaining": float(b.remaining),
            "percentage_used": float(b.percentage_used),
        })

    # User memory
    user_memory = {}
    try:
        mem = user.ai_memory
        user_memory = {
            "financial_personality": mem.financial_personality,
            "facts": mem.facts or [],
            "goals": mem.goals or [],
        }
    except Exception:
        pass

    payload = {
        "user_id": user.id,
        "first_name": user.first_name,
        "preferred_currency": user.preferred_currency,
        "total_income_this_month": float(income_month),
        "total_expenses_this_month": float(expenses_month),
        "savings_rate": savings_rate,
        "categories": categories,
        "monthly_history": monthly_history,
        "active_budgets": active_budgets,
        "user_memory": user_memory,
    }

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.post(
                f"{AI_URL}/api/v1/insights/generate",
                json=payload,
                headers={"X-Service-Key": AI_KEY},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.error("Failed to generate insights: %s", exc)
        return []

    # Save insights to DB
    created = []
    for item in data.get("insights", []):
        insight = AIInsight.objects.create(
            user=user,
            insight_type=item.get("insight_type", "suggestion"),
            title=item.get("title", "Insight"),
            description=item.get("description", ""),
            severity=item.get("severity", "info"),
            data=item.get("data", {}),
        )
        created.append(insight)

    if created:
        logger.info("Generated %d insights for user %d", len(created), user.id)

        # Create notification for critical/warning insights
        _create_insight_notifications(user, created)

    return created


def check_expense_anomaly(user, expense) -> bool:
    """Check if a newly created expense is anomalous.

    Called after expense creation (from signal or action_executor).
    Returns True if anomaly was detected and notification created.
    """
    from apps.expenses.models import Expense  # type: ignore

    category = expense.category
    if not category:
        return False

    # Get category statistics (last 90 days)
    ninety_days_ago = date.today() - timedelta(days=90)
    cat_stats = (
        Expense.objects.filter(
            user=user, category=category, is_deleted=False,
            date__gte=ninety_days_ago,
        )
        .exclude(id=expense.id)
        .aggregate(
            avg=Avg("amount"),
            std=StdDev("amount"),
            count=Count("id"),
        )
    )

    cat_avg = float(cat_stats["avg"] or 0)
    cat_std = float(cat_stats["std"] or 0)
    cat_count = cat_stats["count"] or 0

    if cat_count < 3:  # Not enough data
        return False

    # Recent expenses in this category
    recent = list(
        Expense.objects.filter(
            user=user, category=category, is_deleted=False,
        )
        .exclude(id=expense.id)
        .order_by("-date")[:10]
        .values_list("amount", flat=True)
    )

    payload = {
        "expense_amount": float(expense.amount),
        "expense_category": category.name,
        "expense_merchant": expense.merchant or "",
        "expense_description": expense.description or "",
        "preferred_currency": user.preferred_currency,
        "category_avg": cat_avg,
        "category_std": cat_std,
        "category_count": cat_count,
        "recent_category_expenses": [float(a) for a in recent],
    }

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.post(
                f"{AI_URL}/api/v1/anomaly/check",
                json=payload,
                headers={"X-Service-Key": AI_KEY},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.error("Anomaly check failed: %s", exc)
        return False

    if data.get("is_anomaly"):
        # Create anomaly insight
        AIInsight.objects.create(
            user=user,
            insight_type="anomaly",
            title=f"Unusual {category.name} Expense",
            description=data.get("reason", "This expense is significantly above your average."),
            severity="warning" if data.get("confidence", 0) < 0.8 else "critical",
            data={
                "expense_id": expense.id,
                "amount": float(expense.amount),
                "category": category.name,
                "merchant": expense.merchant or "",
                "confidence": data.get("confidence", 0),
                "suggestion": data.get("suggestion", ""),
            },
        )

        # Create notification
        _create_anomaly_notification(user, expense, data)
        return True

    return False


def update_user_memory(user) -> dict:
    """Analyze spending and update user's AI memory profile.

    Called weekly by background task or manually.
    """
    from apps.expenses.models import Expense, Income  # type: ignore

    today = date.today()
    thirty_days_ago = today - timedelta(days=30)

    # 30-day totals
    exp_total = float(
        Expense.objects.filter(user=user, is_deleted=False, date__gte=thirty_days_ago)
        .aggregate(total=Sum("amount"))["total"] or 0
    )
    inc_total = float(
        Income.objects.filter(user=user, is_deleted=False, date__gte=thirty_days_ago)
        .aggregate(total=Sum("amount"))["total"] or 0
    )

    # Category breakdown
    cat_data = (
        Expense.objects.filter(user=user, is_deleted=False, date__gte=thirty_days_ago)
        .values("category__name")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-total")[:10]
    )
    categories = []
    for c in cat_data:
        total = float(c["total"] or 0)
        count = c["count"] or 1
        categories.append({
            "name": c["category__name"] or "Uncategorized",
            "total": total,
            "count": count,
            "avg_per_transaction": total / count,
        })

    # Daily expenses
    daily_data = (
        Expense.objects.filter(user=user, is_deleted=False, date__gte=thirty_days_ago)
        .values("date")
        .annotate(total=Sum("amount"))
        .order_by("date")
    )
    daily_expenses = [{"date": str(d["date"]), "total": float(d["total"])} for d in daily_data]

    # Top merchants
    merchant_data = (
        Expense.objects.filter(user=user, is_deleted=False, date__gte=thirty_days_ago)
        .exclude(merchant="")
        .values("merchant")
        .annotate(total=Sum("amount"), count=Count("id"))
        .order_by("-count")[:10]
    )
    top_merchants = [
        {"name": m["merchant"], "total": float(m["total"]), "count": m["count"]}
        for m in merchant_data
    ]

    # Existing memory
    existing_memory = {}
    try:
        mem = user.ai_memory
        existing_memory = {
            "financial_personality": mem.financial_personality,
            "facts": mem.facts or [],
            "goals": mem.goals or [],
            "spending_patterns": mem.spending_patterns or {},
        }
    except Exception:
        pass

    payload = {
        "user_id": user.id,
        "first_name": user.first_name,
        "preferred_currency": user.preferred_currency,
        "total_income_30d": inc_total,
        "total_expenses_30d": exp_total,
        "categories": categories,
        "daily_expenses": daily_expenses,
        "top_merchants": top_merchants,
        "existing_memory": existing_memory,
    }

    try:
        with httpx.Client(timeout=TIMEOUT) as client:
            resp = client.post(
                f"{AI_URL}/api/v1/memory/analyze",
                json=payload,
                headers={"X-Service-Key": AI_KEY},
            )
            resp.raise_for_status()
            data = resp.json()
    except Exception as exc:
        logger.error("Memory analysis failed: %s", exc)
        return {}

    # Update UserAIMemory
    from apps.chat.models import UserAIMemory  # type: ignore
    memory, _ = UserAIMemory.objects.get_or_create(user=user)

    if data.get("financial_personality"):
        memory.financial_personality = data["financial_personality"]
    if data.get("spending_patterns"):
        memory.spending_patterns = data["spending_patterns"]
    if data.get("new_facts"):
        facts = memory.facts or []
        for fact in data["new_facts"]:
            if fact not in facts:
                facts.append(fact)
        memory.facts = facts[-50:]
    if data.get("conversation_summary"):
        memory.conversation_summary = data["conversation_summary"]

    memory.save()
    logger.info("Updated memory for user %d: personality=%s", user.id, memory.financial_personality)

    return data


def _create_insight_notifications(user, insights: list[AIInsight]):
    """Create notifications for important insights."""
    from apps.notifications.models import Notification  # type: ignore

    for insight in insights:
        if insight.severity in ("warning", "critical"):
            Notification.objects.create(
                user=user,
                notification_type="insight",
                title=insight.title,
                message=insight.description,
                related_object_type="ai_insight",
                related_object_id=insight.id,
            )


def _create_anomaly_notification(user, expense, anomaly_data: dict):
    """Create a notification for an anomalous expense."""
    from apps.notifications.models import Notification  # type: ignore

    Notification.objects.create(
        user=user,
        notification_type="anomaly",
        title=f"Unusual {expense.category.name if expense.category else ''} Expense",
        message=anomaly_data.get("reason", "An unusual expense was detected."),
        related_object_type="expense",
        related_object_id=expense.id,
    )
