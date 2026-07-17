"""Smoke tests — prove the Django project boots and its URL graph is valid.

These are intentionally minimal. Real app-level tests live under
`apps/<app>/tests.py`. Their job is just to make CI meaningful while the
full test suite is still being built out.
"""

from django.test import Client  # type: ignore
from django.urls import reverse  # type: ignore


def test_django_settings_load():
    """Import the settings module — fails if settings.py has a syntax/config error."""
    from config import settings

    assert settings.INSTALLED_APPS, "INSTALLED_APPS should not be empty"
    assert settings.DATABASES["default"]["ENGINE"], "Default DB engine must be set"


def test_url_conf_resolves():
    """The root URLconf must import without raising."""
    from config import urls

    assert urls.urlpatterns, "Root URLconf has no patterns"


def test_api_schema_endpoint_reachable(db):
    """drf-spectacular schema endpoint should 200 without auth."""
    client = Client()
    url = reverse("schema")
    response = client.get(url)
    assert response.status_code == 200
