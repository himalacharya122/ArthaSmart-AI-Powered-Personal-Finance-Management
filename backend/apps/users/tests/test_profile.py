"""Profile retrieve/update/delete endpoints."""

from __future__ import annotations

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

pytestmark = pytest.mark.django_db


PROFILE_URL = reverse("users:profile")
PROFILE_DELETE_URL = reverse("users:profile-delete")


class TestProfileGet:
    def test_returns_current_user(self, authenticated_client, user):
        r = authenticated_client.get(PROFILE_URL)
        assert r.status_code == 200
        assert r.data["email"] == user.email
        assert r.data["id"] == user.id

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.get(PROFILE_URL)
        assert r.status_code == 401

    def test_password_never_serialized(self, authenticated_client):
        r = authenticated_client.get(PROFILE_URL)
        assert "password" not in r.data


class TestProfileUpdate:
    def test_patch_updates_fields(self, authenticated_client, user):
        r = authenticated_client.patch(
            PROFILE_URL,
            {
                "first_name": "Himal",
                "last_name": "Acharya",
                "phone_number": "+977-9800000000",
                "preferred_currency": "USD",
                "timezone": "UTC",
            },
            format="json",
        )
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.first_name == "Himal"
        assert user.preferred_currency == "USD"
        assert user.timezone == "UTC"

    def test_response_is_full_user_payload(self, authenticated_client):
        r = authenticated_client.patch(PROFILE_URL, {"first_name": "X"}, format="json")
        assert r.status_code == 200
        # UserSerializer exposes email + id; update serializer does not
        assert "email" in r.data
        assert "id" in r.data

    def test_email_not_updatable_via_profile(self, authenticated_client, user):
        original_email = user.email
        r = authenticated_client.patch(PROFILE_URL, {"email": "hacker@evil.com"}, format="json")
        assert r.status_code == 200
        user.refresh_from_db()
        assert user.email == original_email

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.patch(PROFILE_URL, {"first_name": "X"}, format="json")
        assert r.status_code == 401


class TestProfileDelete:
    def test_soft_deletes_account(self, authenticated_client, user):
        r = authenticated_client.delete(PROFILE_DELETE_URL)
        assert r.status_code == 204
        user.refresh_from_db()
        assert user.is_active is False
        # User record still exists
        from apps.users.models import User

        assert User.objects.filter(pk=user.pk).exists()

    def test_writes_audit_log(self, authenticated_client, user):
        from apps.reports.models import AuditLog

        authenticated_client.delete(PROFILE_DELETE_URL)
        assert AuditLog.objects.filter(user=user, action="delete", resource_type="user").exists()

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.delete(PROFILE_DELETE_URL)
        assert r.status_code == 401
