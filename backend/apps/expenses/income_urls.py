"""Incomes URL configuration (separate from expenses)."""

from django.urls import include, path  # type: ignore
from rest_framework.routers import DefaultRouter  # type: ignore

from .views import IncomeViewSet

app_name = "incomes"

router = DefaultRouter()
router.register("", IncomeViewSet, basename="income")

urlpatterns = [
    path("", include(router.urls)),
]
