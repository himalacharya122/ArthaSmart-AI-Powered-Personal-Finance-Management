"""Chat URL configuration."""
from django.urls import include, path # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore

from .views import ChatConversationViewSet

app_name = "chat"

router = DefaultRouter()
router.register("conversations", ChatConversationViewSet, basename="conversation")

urlpatterns = [
    path("", include(router.urls)),
]
