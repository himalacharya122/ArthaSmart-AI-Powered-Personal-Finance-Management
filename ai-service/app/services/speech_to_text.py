"""Speech-to-Text service using Groq Whisper API."""

from __future__ import annotations

import logging
import time

from app.config import get_settings
from app.services.groq_client import get_groq_client

logger = logging.getLogger(__name__)


def transcribe_audio(
    audio_bytes: bytes,
    filename: str = "audio.webm",
    language: str | None = None,
) -> dict:
    """Transcribe audio using Groq's Whisper model.

    Args:
        audio_bytes: Raw audio file bytes.
        filename: Original filename (helps Whisper detect format).
        language: Optional ISO 639-1 language code (e.g., "en", "ne").

    Returns:
        {
            "text": str,           # Transcribed text
            "language": str,       # Detected language
            "duration_ms": int,    # Processing time in ms
        }
    """
    settings = get_settings()
    client = get_groq_client()

    start = time.perf_counter()

    # Build kwargs
    kwargs = {
        "model": settings.stt_model,
        "file": (filename, audio_bytes),
        "response_format": "verbose_json",
    }
    if language:
        kwargs["language"] = language

    try:
        transcription = client.audio.transcriptions.create(**kwargs)
    except Exception as exc:
        logger.error("Whisper transcription failed: %s", exc)
        raise

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    text = transcription.text or ""
    detected_lang = getattr(transcription, "language", "en") or "en"

    logger.info(
        "Transcribed %d bytes in %dms: '%s' (lang=%s)",
        len(audio_bytes),
        elapsed_ms,
        text[:80],
        detected_lang,
    )

    return {
        "text": text.strip(),
        "language": detected_lang,
        "duration_ms": elapsed_ms,
    }
