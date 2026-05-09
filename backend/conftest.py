"""Root pytest fixtures and factories for the ArthaSmart backend test suite.

Why these live here:
- factory-boy factories for every core model keep tests concise and readable.
- `api_client` / `authenticated_client` cover the 90% DRF-test path.
- `disable_anomaly_signal` (autouse) disconnects the Expense post_save signal
  that spawns a daemon thread calling the AI service — it races with test
  teardown, hits the network, and is never the subject of the test.
- `mock_ai_service` wraps pytest-httpx so any app making outbound HTTPX calls
  to the AI service gets deterministic responses.
"""

from __future__ import annotations

import os
from datetime import date, timedelta
from decimal import Decimal

import factory  # type: ignore
import pytest  # type: ignore
from django.db.models.signals import post_save  # type: ignore
from rest_framework.test import APIClient  # type: ignore


def pytest_configure():
    """
    Force test settings before any fixtures run.
    """
    os.environ["CELERY_TASK_ALWAYS_EAGER"] = "True"
    from django.conf import settings  # type: ignore

    settings.CACHES = {
        "default": {
            "BACKEND": "django.core.cache.backends.locmem.LocMemCache",
        }
    }
    settings.CELERY_TASK_ALWAYS_EAGER = True
    settings.CELERY_BROKER_URL = "memory://"
    settings.CELERY_RESULT_BACKEND = "cache"


# Factories


class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "users.User"
        django_get_or_create = ("email",)
        skip_postgeneration_save = True

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    username = factory.Sequence(lambda n: f"user{n}")
    first_name = "Test"
    last_name = "User"
    is_email_verified = True
    is_active = True
    preferred_currency = "NPR"
    timezone = "Asia/Kathmandu"

    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        if not create:
            return
        self.set_password(extracted or "testpass123")
        self.save(update_fields=["password"])


class CategoryFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "categories.Category"

    name = factory.Sequence(lambda n: f"Category {n}")
    slug = factory.Sequence(lambda n: f"category-{n}")
    type = "expense"
    user = factory.SubFactory(UserFactory)
    is_default = False
    is_active = True


class ExpenseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "expenses.Expense"

    user = factory.SubFactory(UserFactory)
    amount = Decimal("100.00")
    currency = "NPR"
    category = factory.SubFactory(CategoryFactory, user=factory.SelfAttribute("..user"))
    description = "Test expense"
    merchant = "Test Merchant"
    date = factory.LazyFunction(date.today)
    source = "manual"


class IncomeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "expenses.Income"

    user = factory.SubFactory(UserFactory)
    amount = Decimal("1000.00")
    currency = "NPR"
    source_name = "TBC Salary"
    date = factory.LazyFunction(date.today)


class BudgetFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "budgets.Budget"

    user = factory.SubFactory(UserFactory)
    name = factory.Sequence(lambda n: f"Budget {n}")
    amount = Decimal("5000.00")
    spent = Decimal("0.00")
    currency = "NPR"
    category = None
    period = "monthly"
    start_date = factory.LazyFunction(lambda: date.today().replace(day=1))
    end_date = factory.LazyFunction(lambda: date.today().replace(day=1) + timedelta(days=30))
    is_active = True


class RecurringTransactionFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = "expenses.RecurringTransaction"

    user = factory.SubFactory(UserFactory)
    type = "expense"
    amount = Decimal("500.00")
    currency = "NPR"
    frequency = "monthly"
    day_of_month = 1
    next_occurrence = factory.LazyFunction(lambda: date.today() + timedelta(days=1))
    is_active = True


# Fixtures


@pytest.fixture
def user_factory():
    return UserFactory


@pytest.fixture
def category_factory():
    return CategoryFactory


@pytest.fixture
def expense_factory():
    return ExpenseFactory


@pytest.fixture
def income_factory():
    return IncomeFactory


@pytest.fixture
def budget_factory():
    return BudgetFactory


@pytest.fixture
def recurring_factory():
    return RecurringTransactionFactory


@pytest.fixture
def user(db):
    return UserFactory()


@pytest.fixture
def other_user(db):
    return UserFactory()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def authenticated_client(user):
    """An APIClient authenticated as `user` via JWT access token."""
    from rest_framework_simplejwt.tokens import RefreshToken  # type: ignore

    client = APIClient()
    token = str(RefreshToken.for_user(user).access_token)
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token}")
    return client


@pytest.fixture(autouse=True)
def _reset_throttle_cache():
    """Clear Django's cache before every test.

    DRF's SimpleRateThrottle stores hit counters in the default cache. Without
    this fixture the counters persist across tests, so after the first few
    password-reset-confirm tests run, subsequent tests on the same endpoint
    get a 429 before their view is ever reached. Clearing once per test is
    cheap and leaves real throttle assertions working (they still hit the
    limit within a single test).
    """
    from django.core.cache import cache  # type: ignore

    cache.clear()
    yield
    cache.clear()


@pytest.fixture(autouse=True)
def disable_anomaly_signal():
    """Disconnect the Expense post_save signal that spawns a daemon thread.

    The signal handler calls the AI service in a background thread and races
    with test teardown, occasionally producing OperationalError noise. Tests
    that want to exercise that path can re-connect explicitly.
    """
    try:
        from apps.expenses.models import Expense
        from apps.expenses.signals import check_expense_anomaly_on_create
    except Exception:
        yield
        return

    post_save.disconnect(check_expense_anomaly_on_create, sender=Expense)
    try:
        yield
    finally:
        post_save.connect(check_expense_anomaly_on_create, sender=Expense)


@pytest.fixture
def mock_ai_service(httpx_mock):
    """Stub all AI-service HTTP calls with success responses."""
    import re

    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/chat.*"),
        json={"message": "ok", "conversation_id": 1, "tool_calls": []},
    )
    httpx_mock.add_response(
        url=re.compile(r".*/api/v1/insights.*"),
        json={"insights": []},
    )
    return httpx_mock


@pytest.fixture
def disable_throttling(settings):
    """Disable DRF throttling for tests that would otherwise trip rate limits."""
    settings.REST_FRAMEWORK = {
        **settings.REST_FRAMEWORK,
        "DEFAULT_THROTTLE_CLASSES": [],
        "DEFAULT_THROTTLE_RATES": {},
    }
