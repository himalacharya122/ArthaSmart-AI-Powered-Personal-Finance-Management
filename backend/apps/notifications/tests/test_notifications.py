"""Notification list/read/dismiss + preference CRUD."""

from __future__ import annotations

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.notifications.models import Notification, NotificationPreference

pytestmark = pytest.mark.django_db

LIST_URL = reverse("notifications:notification-list")
UNREAD_URL = reverse("notifications:notification-unread-count")
READ_ALL_URL = reverse("notifications:notification-read-all")
PREFS_URL = reverse("notifications:notification-preferences")


def _detail(pk):
    return reverse("notifications:notification-detail", args=[pk])


def _read(pk):
    return reverse("notifications:notification-read", args=[pk])


def _notif(user, **kw):
    defaults = {
        "title": "Hi",
        "message": "Msg",
        "notification_type": "system",
    }
    defaults.update(kw)
    return Notification.objects.create(user=user, **defaults)


class TestList:
    def test_list_scoped(self, authenticated_client, user, other_user):
        _notif(user, title="mine")
        _notif(other_user, title="theirs")
        r = authenticated_client.get(LIST_URL)
        titles = {n["title"] for n in r.data["results"]}
        assert titles == {"mine"}

    def test_filter_is_read(self, authenticated_client, user):
        _notif(user, title="a", is_read=True)
        _notif(user, title="b", is_read=False)
        r = authenticated_client.get(LIST_URL, {"is_read": "false"})
        assert {n["title"] for n in r.data["results"]} == {"b"}

    def test_filter_by_type(self, authenticated_client, user):
        _notif(user, title="bud", notification_type="budget_alert")
        _notif(user, title="sys", notification_type="system")
        r = authenticated_client.get(LIST_URL, {"notification_type": "budget_alert"})
        assert {n["title"] for n in r.data["results"]} == {"bud"}

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(LIST_URL).status_code == 401


class TestActions:
    def test_unread_count(self, authenticated_client, user):
        _notif(user, is_read=False)
        _notif(user, is_read=False)
        _notif(user, is_read=True)
        r = authenticated_client.get(UNREAD_URL)
        assert r.data["count"] == 2

    def test_mark_read(self, authenticated_client, user):
        n = _notif(user, is_read=False)
        r = authenticated_client.post(_read(n.pk))
        assert r.status_code == 200
        n.refresh_from_db()
        assert n.is_read is True

    def test_read_all(self, authenticated_client, user):
        _notif(user, is_read=False)
        _notif(user, is_read=False)
        r = authenticated_client.post(READ_ALL_URL)
        assert r.data["updated"] == 2
        assert Notification.objects.filter(user=user, is_read=False).count() == 0

    def test_cannot_read_other_users(self, authenticated_client, other_user):
        n = _notif(other_user)
        assert authenticated_client.post(_read(n.pk)).status_code == 404

    def test_destroy(self, authenticated_client, user):
        n = _notif(user)
        r = authenticated_client.delete(_detail(n.pk))
        assert r.status_code == 204
        assert not Notification.objects.filter(pk=n.pk).exists()


class TestPreferences:
    def test_get_returns_user_prefs(self, authenticated_client, user, other_user):
        NotificationPreference.objects.create(
            user=user, notification_type="budget_alert", email_enabled=False
        )
        NotificationPreference.objects.create(user=other_user, notification_type="budget_alert")
        r = authenticated_client.get(PREFS_URL)
        assert r.status_code == 200
        prefs = r.data["preferences"]
        assert len(prefs) == 1
        assert prefs[0]["email_enabled"] is False

    def test_put_upserts(self, authenticated_client, user):
        payload = {
            "preferences": [
                {
                    "notification_type": "budget_alert",
                    "email_enabled": False,
                    "sms_enabled": True,
                    "push_enabled": True,
                    "in_app_enabled": True,
                },
                {
                    "notification_type": "insight",
                    "email_enabled": True,
                    "sms_enabled": False,
                    "push_enabled": False,
                    "in_app_enabled": True,
                },
            ]
        }
        r = authenticated_client.put(PREFS_URL, payload, format="json")
        assert r.status_code == 200
        assert NotificationPreference.objects.filter(user=user).count() == 2
        ba = NotificationPreference.objects.get(user=user, notification_type="budget_alert")
        assert ba.email_enabled is False and ba.sms_enabled is True

    def test_put_updates_existing(self, authenticated_client, user):
        NotificationPreference.objects.create(
            user=user, notification_type="budget_alert", email_enabled=True
        )
        payload = {
            "preferences": [
                {
                    "notification_type": "budget_alert",
                    "email_enabled": False,
                    "sms_enabled": False,
                    "push_enabled": False,
                    "in_app_enabled": False,
                }
            ]
        }
        authenticated_client.put(PREFS_URL, payload, format="json")
        assert NotificationPreference.objects.filter(user=user).count() == 1
        pref = NotificationPreference.objects.get(user=user)
        assert pref.email_enabled is False

    def test_unauthenticated_rejected(self, api_client):
        assert api_client.get(PREFS_URL).status_code == 401


class TestEmailTask:
    def test_send_email_task_uses_send_mail(self, settings):
        from apps.notifications import tasks

        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        from django.core import mail  # type: ignore

        tasks.send_email_task("Hi", "Body", ["to@example.com"], from_email="from@example.com")
        assert len(mail.outbox) == 1
        assert mail.outbox[0].subject == "Hi"

    def test_budget_alert(self, settings, user):
        from apps.notifications.tasks import send_budget_alert

        settings.EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
        from django.core import mail  # type: ignore

        send_budget_alert(user.id, "Food", 92.5)
        assert len(mail.outbox) == 1
        assert "Food" in mail.outbox[0].subject
