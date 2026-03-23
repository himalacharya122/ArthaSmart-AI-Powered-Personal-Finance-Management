"""Post-save signals for expenses — triggers anomaly detection."""

import logging
import threading

from django.db.models.signals import post_save # type: ignore
from django.dispatch import receiver # type: ignore

logger = logging.getLogger(__name__)


@receiver(post_save, sender="expenses.Expense")
def check_expense_anomaly_on_create(sender, instance, created, **kwargs):
    """When a new expense is created, check if it's anomalous.

    Runs in a background thread so it doesn't slow down the response.
    """
    if not created:
        return

    if instance.is_deleted:
        return

    def _run_check():
        try:
            from apps.ai_insights.services import check_expense_anomaly
            check_expense_anomaly(instance.user, instance)
        except Exception as exc:
            logger.warning("Anomaly check failed for expense #%d: %s", instance.id, exc)

    thread = threading.Thread(target=_run_check, daemon=True)
    thread.start()
