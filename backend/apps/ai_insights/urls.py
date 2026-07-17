"""AI Insights URL configuration."""

from django.urls import include, path  # type: ignore
from rest_framework.routers import DefaultRouter  # type: ignore

from .views import AIInsightViewSet

app_name = "ai_insights"

router = DefaultRouter()
router.register("", AIInsightViewSet, basename="ai-insight")

urlpatterns = [
    path("", include(router.urls)),
]
