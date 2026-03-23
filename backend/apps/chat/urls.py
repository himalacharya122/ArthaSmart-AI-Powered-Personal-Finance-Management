"""Chat URL configuration."""
from django.urls import include, path # type: ignore
from rest_framework.routers import DefaultRouter # type: ignore

from .views import ChatConversationViewSet
from .views_voice import VoiceTranscribeView

app_name = "chat"

router = DefaultRouter()
router.register("conversations", ChatConversationViewSet, basename="conversation")

urlpatterns = [
    path("voice/transcribe/", VoiceTranscribeView.as_view(), name="voice-transcribe"),
    path("", include(router.urls)),
]
