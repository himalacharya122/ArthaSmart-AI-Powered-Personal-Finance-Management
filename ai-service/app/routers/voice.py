"""Voice endpoints — speech-to-text transcription."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status  # type: ignore

from app.core.rate_limiter import rate_limiter
from app.core.security import verify_service_key
from app.services.speech_to_text import transcribe_audio

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])

# Max audio file size: 25 MB (Groq Whisper limit)
MAX_AUDIO_SIZE = 25 * 1024 * 1024

# Accepted audio MIME types
ACCEPTED_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/mp3",
    "audio/mpeg",
    "audio/mp4",
    "audio/ogg",
    "audio/flac",
    "audio/x-m4a",
    "audio/m4a",
    "video/webm",  # Browser MediaRecorder sometimes reports video/webm for audio-only
}


@router.post("/transcribe")
async def transcribe_endpoint(
    audio: UploadFile = File(..., description="Audio file to transcribe"),
    user_id: int = Form(default=0, description="User ID for rate limiting"),
    _: str = Depends(verify_service_key),
):
    """Transcribe audio file to text using Groq Whisper.

    Accepts audio files up to 25MB in common formats (webm, wav, mp3, etc.).
    Called by Django backend as a proxy for the frontend.

    Returns:
        {
            "text": "transcribed text",
            "language": "en",
            "duration_ms": 1234,
        }
    """
    # Rate limit check
    if user_id > 0:
        rate_limiter.check_voice(user_id)

    # Validate content type
    content_type = audio.content_type or ""
    if content_type not in ACCEPTED_TYPES:
        logger.warning("Rejected audio upload: unsupported type %s", content_type)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported audio format: {content_type}. Accepted: webm, wav, mp3, ogg, flac, m4a.",
        )

    # Read audio bytes
    audio_bytes = await audio.read()

    if len(audio_bytes) > MAX_AUDIO_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Audio file too large ({len(audio_bytes) / 1024 / 1024:.1f}MB). Max: 25MB.",
        )

    if len(audio_bytes) < 100:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is too small or empty.",
        )

    filename = audio.filename or "audio.webm"

    try:
        result = transcribe_audio(audio_bytes, filename=filename)
    except Exception as exc:
        logger.error("Transcription failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Transcription failed. Please try again.",
        )

    if not result.get("text"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Could not detect speech in the audio. Please speak clearly and try again.",
        )

    return result
