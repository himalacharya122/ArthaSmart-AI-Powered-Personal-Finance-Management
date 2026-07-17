"""Tests for the Category model + ViewSet.

Covers: model defaults, auto-slug on save, per-user scoping,
system-default immutability, soft-delete on DELETE, duplicate-name
validation, and filter/search.
"""

from __future__ import annotations

import pytest  # type: ignore
from django.urls import reverse  # type: ignore

from apps.categories.models import Category

pytestmark = pytest.mark.django_db

LIST_URL = reverse("categories:category-list")


def _detail(pk):
    return reverse("categories:category-detail", args=[pk])


# ---------------------------------------------------------------------------
# Model
# ---------------------------------------------------------------------------


class TestCategoryModel:
    def test_save_generates_slug(self, user):
        c = Category.objects.create(name="Eating Out", user=user)
        assert c.slug == "eating-out"

    def test_slug_not_overwritten_if_provided(self, user):
        c = Category.objects.create(name="Food", slug="custom", user=user)
        assert c.slug == "custom"

    def test_defaults(self, user):
        c = Category.objects.create(name="Food", user=user)
        assert c.type == "expense"
        assert c.is_default is False
        assert c.is_active is True
        assert c.color == "#6366F1"

    def test_system_default_has_no_user(self):
        c = Category.objects.create(name="Default", is_default=True)
        assert c.user is None
        assert "System" in str(c)

    def test_user_category_str_contains_user_id(self, user):
        c = Category.objects.create(name="Mine", user=user)
        assert f"User:{user.id}" in str(c)

    def test_unique_together_user_slug_type(self, user):
        Category.objects.create(name="Food", slug="food", type="expense", user=user)
        with pytest.raises(Exception):  # IntegrityError
            Category.objects.create(name="Food", slug="food", type="expense", user=user)

    def test_same_slug_different_type_allowed(self, user):
        Category.objects.create(name="Food", slug="food", type="expense", user=user)
        Category.objects.create(name="Food", slug="food", type="income", user=user)


# ---------------------------------------------------------------------------
# ViewSet - queryset scoping
# ---------------------------------------------------------------------------


class TestCategoryListScoping:
    def test_returns_own_and_defaults(self, authenticated_client, user, other_user):
        Category.objects.create(name="Default Food", is_default=True)
        Category.objects.create(name="Mine", user=user)
        Category.objects.create(name="Theirs", user=other_user)
        r = authenticated_client.get(LIST_URL)
        assert r.status_code == 200
        names = {c["name"] for c in r.data["results"]}
        assert names == {"Default Food", "Mine"}

    def test_inactive_hidden(self, authenticated_client, user):
        Category.objects.create(name="Visible", user=user)
        Category.objects.create(name="Hidden", user=user, is_active=False)
        r = authenticated_client.get(LIST_URL)
        names = {c["name"] for c in r.data["results"]}
        assert names == {"Visible"}

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.get(LIST_URL)
        assert r.status_code == 401

    def test_filter_by_type(self, authenticated_client, user):
        Category.objects.create(name="Food", type="expense", user=user)
        Category.objects.create(name="Salary", type="income", user=user)
        r = authenticated_client.get(LIST_URL, {"type": "income"})
        names = {c["name"] for c in r.data["results"]}
        assert names == {"Salary"}

    def test_search_by_name(self, authenticated_client, user):
        Category.objects.create(name="Food", user=user)
        Category.objects.create(name="Transport", user=user)
        r = authenticated_client.get(LIST_URL, {"search": "Food"})
        names = {c["name"] for c in r.data["results"]}
        assert names == {"Food"}


# ---------------------------------------------------------------------------
# ViewSet - create/update/delete
# ---------------------------------------------------------------------------


class TestCategoryCreate:
    def test_creates_for_current_user_not_default(self, authenticated_client, user):
        r = authenticated_client.post(
            LIST_URL,
            {"name": "Coffee", "type": "expense", "color": "#FF0000", "icon": "coffee"},
            format="json",
        )
        assert r.status_code == 201
        c = Category.objects.get(name="Coffee")
        assert c.user == user
        assert c.is_default is False

    def test_cannot_set_is_default_via_api(self, authenticated_client):
        r = authenticated_client.post(
            LIST_URL,
            {"name": "Hacked", "type": "expense", "is_default": True},
            format="json",
        )
        assert r.status_code == 201
        c = Category.objects.get(name="Hacked")
        assert c.is_default is False

    def test_duplicate_name_same_type_rejected(self, authenticated_client, user):
        Category.objects.create(name="Food", type="expense", user=user)
        r = authenticated_client.post(LIST_URL, {"name": "food", "type": "expense"}, format="json")
        assert r.status_code == 400

    def test_duplicate_name_different_type_allowed(self, authenticated_client, user):
        Category.objects.create(name="Side", type="expense", user=user)
        r = authenticated_client.post(LIST_URL, {"name": "Side", "type": "income"}, format="json")
        assert r.status_code == 201


class TestCategoryUpdate:
    def test_can_update_own(self, authenticated_client, user):
        c = Category.objects.create(name="Old", type="expense", user=user)
        r = authenticated_client.patch(
            _detail(c.pk), {"name": "New", "color": "#00FF00"}, format="json"
        )
        assert r.status_code == 200
        c.refresh_from_db()
        assert c.name == "New"
        assert c.color == "#00FF00"

    def test_cannot_update_system_default(self, authenticated_client):
        c = Category.objects.create(name="Sys", is_default=True)
        r = authenticated_client.patch(_detail(c.pk), {"name": "Hacked"}, format="json")
        assert r.status_code == 403

    def test_cannot_update_other_users(self, authenticated_client, other_user):
        c = Category.objects.create(name="Theirs", user=other_user)
        # Must be visible via queryset to reach perform_update — it isn't,
        # so we get 404 rather than 403.
        r = authenticated_client.patch(_detail(c.pk), {"name": "X"}, format="json")
        assert r.status_code in (403, 404)


class TestCategoryDelete:
    def test_soft_delete(self, authenticated_client, user):
        c = Category.objects.create(name="Bye", user=user)
        r = authenticated_client.delete(_detail(c.pk))
        assert r.status_code == 204
        c.refresh_from_db()
        assert c.is_active is False
        assert Category.objects.filter(pk=c.pk).exists()  # row still present

    def test_cannot_delete_system_default(self, authenticated_client):
        c = Category.objects.create(name="Sys", is_default=True)
        r = authenticated_client.delete(_detail(c.pk))
        assert r.status_code == 403

    def test_cannot_delete_other_users(self, authenticated_client, other_user):
        c = Category.objects.create(name="Theirs", user=other_user)
        r = authenticated_client.delete(_detail(c.pk))
        assert r.status_code in (403, 404)
