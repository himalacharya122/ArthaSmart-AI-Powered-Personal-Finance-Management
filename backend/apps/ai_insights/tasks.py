"""Background tasks for AI insights."""
import logging
from celery import shared_task # type: ignore

logger = logging.getLogger(__name__)


@shared_task
def generate_daily_insights(user_id):
    """Generate daily spending insights for a user."""
    from apps.users.models import User
    from apps.expenses.models import Expense
    from apps.ai_insights.models import Insight
    from django.utils import timezone # type: ignore
    from datetime import timedelta

    try:
        user = User.objects.get(id=user_id)
        today = timezone.now().date()
        week_ago = today - timedelta(days=7)

        expenses = Expense.objects.filter(user=user, date__gte=week_ago, date__lte=today)
        total = sum(float(e.amount) for e in expenses)
        count = expenses.count()

        if count > 0:
            Insight.objects.create(
                user=user,
                insight_type="spending_summary",
                title=f"Weekly Spending: Rs {total:,.0f}",
                description=f"You made {count} transactions totaling Rs {total:,.2f} in the last 7 days.",
                data={"total": float(total), "count": count, "period": "7d"},
            )
            logger.info("Daily insight generated for user %s", user.email)
    except Exception as exc:
        logger.error("Failed to generate insight for user %s: %s", user_id, exc)


@shared_task
def detect_anomalies(user_id):
    """Detect unusual spending patterns for a user."""
    from apps.users.models import User
    from apps.expenses.models import Expense
    from apps.ai_insights.models import Insight
    from django.utils import timezone # type: ignore
    from datetime import timedelta
    from django.db.models import Avg # type: ignore

    try:
        user = User.objects.get(id=user_id)
        today = timezone.now().date()

        # Compare this week vs 4-week average
        this_week = Expense.objects.filter(
            user=user, date__gte=today - timedelta(days=7)
        )
        this_week_total = sum(float(e.amount) for e in this_week)

        four_weeks = Expense.objects.filter(
            user=user, date__gte=today - timedelta(days=28)
        )
        four_week_total = sum(float(e.amount) for e in four_weeks)
        weekly_avg = four_week_total / 4 if four_week_total else 0

        if weekly_avg > 0 and this_week_total > weekly_avg * 1.5:
            spike = ((this_week_total - weekly_avg) / weekly_avg) * 100
            Insight.objects.create(
                user=user,
                insight_type="anomaly",
                title="Spending Spike Detected",
                description=f"Your spending this week is {spike:.0f}% above your 4-week average.",
                data={"this_week": float(this_week_total), "avg": float(weekly_avg), "spike_pct": float(spike)},
            )
            logger.info("Anomaly detected for user %s: %.0f%% spike", user.email, spike)
    except Exception as exc:
        logger.error("Anomaly detection failed for user %s: %s", user_id, exc)
