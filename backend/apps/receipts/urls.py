"""Receipts URL configuration."""

from django.urls import include, path  # type: ignore
from rest_framework.routers import DefaultRouter  # type: ignore

from .views import ReceiptViewSet

app_name = "receipts"

router = DefaultRouter()
router.register("", ReceiptViewSet, basename="receipt")

urlpatterns = [
    path("", include(router.urls)),
]
