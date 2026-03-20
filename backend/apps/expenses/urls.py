"""Expenses URL configuration."""
from django.urls import include, path # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore

from .views import ExpenseViewSet

app_name = "expenses"

router = DefaultRouter()
router.register("", ExpenseViewSet, basename="expense")

urlpatterns = [
    path("", include(router.urls)),
]
