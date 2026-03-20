"""Recurring transactions URL configuration."""
from django.urls import include, path # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore

from .views import RecurringTransactionViewSet

app_name = "recurring_transactions"

router = DefaultRouter()
router.register("", RecurringTransactionViewSet, basename="recurring-transaction")

urlpatterns = [
    path("", include(router.urls)),
]
