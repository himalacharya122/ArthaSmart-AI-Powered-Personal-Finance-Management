"""Background tasks for notifications."""
import logging
from celery import shared_task # type: ignore
from django.core.mail import send_mail # type: ignore
from django.conf import settings # type: ignore

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=60)
def send_email_task(self, subject, message, recipient_list, from_email=None):
    """Send an email in the background."""
    try:
        send_mail(
            subject,
            message,
            from_email or settings.DEFAULT_FROM_EMAIL,
            recipient_list,
            fail_silently=False,
        )
        logger.info("Email sent to %s", recipient_list)
    except Exception as exc:
        logger.error("Failed to send email: %s", exc)
        raise self.retry(exc=exc)


@shared_task
def send_budget_alert(user_id, budget_name, spent_percentage):
    """Send budget threshold alert email."""
    from apps.users.models import User
    try:
        user = User.objects.get(id=user_id)
        subject = f"ArthaSmart — Budget Alert: {budget_name}"
        message = (
            f"Hi {user.first_name or user.username},\n\n"
            f"Your budget '{budget_name}' has reached {spent_percentage:.0f}% of its limit.\n\n"
            f"Consider reviewing your spending.\n\n"
            f"— ArthaSmart Team"
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
    except Exception as exc:
        logger.error("Budget alert failed for user %s: %s", user_id, exc)
