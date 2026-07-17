"""Background tasks for reports."""

import logging

from celery import shared_task  # type: ignore

logger = logging.getLogger(__name__)


@shared_task
def generate_monthly_report(user_id, month=None, year=None):
    """Generate a monthly financial report for a user."""
    from django.utils import timezone  # type: ignore

    from apps.expenses.models import Expense
    from apps.reports.models import AuditLog
    from apps.users.models import User

    try:
        user = User.objects.get(id=user_id)
        now = timezone.now()
        target_month = month or now.month
        target_year = year or now.year

        expenses = Expense.objects.filter(
            user=user,
            date__year=target_year,
            date__month=target_month,
        )

        total = sum(float(e.amount) for e in expenses)
        count = expenses.count()

        # Group by category
        category_breakdown = {}
        for expense in expenses:
            cat_name = expense.category.name if expense.category else "Uncategorized"
            category_breakdown[cat_name] = category_breakdown.get(cat_name, 0) + float(
                expense.amount
            )

        AuditLog.objects.create(
            user=user,
            action="report_generated",
            resource_type="monthly_report",
            resource_id=0,
            details={
                "month": target_month,
                "year": target_year,
                "total_expenses": float(total),
                "transaction_count": count,
                "category_breakdown": category_breakdown,
            },
        )

        logger.info(
            "Monthly report generated for user %s: %d/%d", user.email, target_month, target_year
        )
        return {"total": float(total), "count": count, "categories": category_breakdown}
    except Exception as exc:
        logger.error("Monthly report failed for user %s: %s", user_id, exc)
        return None
