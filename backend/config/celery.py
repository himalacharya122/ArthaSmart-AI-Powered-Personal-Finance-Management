"""Celery configuration for ArthaSmart."""
import os

from celery import Celery
from celery.schedules import crontab # type: ignore

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

app = Celery("arthasmart")

app.config_from_object("django.conf:settings", namespace="CELERY")

# Auto-discover tasks in all installed apps
app.autodiscover_tasks()

# Beat schedule for periodic tasks
app.conf.beat_schedule = {
    "daily-financial-report": {
        "task": "apps.ai_insights.tasks.generate_daily_insights",
        "schedule": crontab(hour=8, minute=0),  # Every day at 8:00 AM
        "args": [],
    },
    "weekly-spending-summary": {
        "task": "apps.ai_insights.tasks.detect_anomalies",
        "schedule": crontab(hour=8, minute=0, day_of_week="sunday"),  # Sundays at 8:00 AM
        "args": [],
    },
}
