"""Budgets URL configuration."""
from django.urls import include, path # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore

from .views import BudgetViewSet

app_name = "budgets"

router = DefaultRouter()
router.register("", BudgetViewSet, basename="budget")

urlpatterns = [
    path("", include(router.urls)),
]
