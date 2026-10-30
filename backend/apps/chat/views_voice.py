"""Voice transcription proxy — forwards audio to the AI service for STT."""

import logging

import httpx  # type: ignore
from django.conf import settings as django_settings  # type: ignore
from rest_framework import status  # type: ignore
from rest_framework.parsers import MultiPartParser  # type: ignore
from rest_framework.permissions import IsAuthenticated  # type: ignore
from rest_framework.response import Response  # type: ignore
from rest_framework.views import APIView  # type: ignore

logger = logging.getLogger(__name__)

AI_URL = getattr(django_settings, "AI_SERVICE_URL", "http://localhost:8001")
AI_KEY = getattr(django_settings, "AI_SERVICE_KEY", "dev-service-key-change-me")

# Longer timeout for voice — transcription can take a few seconds
TIMEOUT = httpx.Timeout(timeout=30.0, connect=5.0)

# Max file size: 25 MB
MAX_AUDIO_SIZE = 25 * 1024 * 1024


class VoiceTranscribeView(APIView):
    """POST /api/v1/chat/voice/transcribe/

    Accepts an audio file upload and returns transcribed text.
    Proxies the request to the FastAPI AI service.
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        audio_file = request.FILES.get("audio")
        if not audio_file:
            return Response(
                {"detail": "No audio file provided. Send a file with key 'audio'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if audio_file.size > MAX_AUDIO_SIZE:
            return Response(
                {
                    "detail": f"Audio file too large ({audio_file.size / 1024 / 1024:.1f}MB). Max: 25MB."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Read the file bytes
        audio_bytes = audio_file.read()

        try:
            with httpx.Client(timeout=TIMEOUT) as client:
                resp = client.post(
                    f"{AI_URL}/api/v1/voice/transcribe",
                    files={
                        "audio": (
                            audio_file.name or "audio.webm",
                            audio_bytes,
                            audio_file.content_type or "audio/webm",
                        )
                    },
                    data={"user_id": str(request.user.id)},
                    headers={"X-Service-Key": AI_KEY},
                )
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPStatusError as exc:
            # Forward the AI service's error message
            try:
                detail = exc.response.json().get("detail", "Transcription failed.")
            except Exception:
                detail = "Transcription failed."
            logger.error("Voice transcription failed: %s — %s", exc.response.status_code, detail)
            return Response(
                {"detail": detail},
                status=exc.response.status_code,
            )
        except Exception as exc:
            logger.error("Voice transcription error: %s", exc)
            return Response(
                {"detail": "Voice transcription service unavailable. Please try again."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        return Response(data, status=status.HTTP_200_OK)
