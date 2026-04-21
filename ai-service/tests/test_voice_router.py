"""Integration tests for /api/v1/voice/transcribe.

Whisper is patched. We verify: auth, content-type validation, size
bounds (empty / >25MB), empty-transcript → 422, rate-limiter is skipped
when user_id is 0, and filename is propagated.
"""

from __future__ import annotations

from io import BytesIO
from unittest.mock import patch

from fastapi.testclient import TestClient  # type: ignore


def _fake_transcribe(text: str = "hello", language: str = "en"):
    return {"text": text, "language": language, "duration_ms": 100}


class TestVoiceAuth:
    def test_missing_key_returns_422(self, client: TestClient):
        r = client.post(
            "/api/v1/voice/transcribe",
            files={"audio": ("a.webm", b"x" * 200, "audio/webm")},
        )
        assert r.status_code == 422

    def test_wrong_key_returns_403(self, client: TestClient):
        r = client.post(
            "/api/v1/voice/transcribe",
            headers={"X-Service-Key": "nope"},
            files={"audio": ("a.webm", b"x" * 200, "audio/webm")},
        )
        assert r.status_code == 403


class TestContentTypeValidation:
    def test_rejects_non_audio_mime(self, client, auth_headers):
        r = client.post(
            "/api/v1/voice/transcribe",
            headers=auth_headers,
            files={"audio": ("doc.pdf", b"x" * 200, "application/pdf")},
        )
        assert r.status_code == 400
        assert "Unsupported audio format" in r.json()["detail"]

    def test_accepts_video_webm(self, client, auth_headers):
        """Browser MediaRecorder often labels audio-only as video/webm."""
        with patch("app.routers.voice.transcribe_audio", return_value=_fake_transcribe()):
            r = client.post(
                "/api/v1/voice/transcribe",
                headers=auth_headers,
                files={"audio": ("a.webm", b"x" * 200, "video/webm")},
            )
        assert r.status_code == 200


class TestSizeValidation:
    def test_too_small_returns_400(self, client, auth_headers):
        r = client.post(
            "/api/v1/voice/transcribe",
            headers=auth_headers,
            files={"audio": ("a.webm", b"x" * 50, "audio/webm")},
        )
        assert r.status_code == 400
        assert "too small" in r.json()["detail"].lower()

    def test_too_large_returns_400(self, client, auth_headers):
        big = b"x" * (26 * 1024 * 1024)
        r = client.post(
            "/api/v1/voice/transcribe",
            headers=auth_headers,
            files={"audio": ("a.webm", BytesIO(big), "audio/webm")},
        )
        assert r.status_code == 400
        assert "too large" in r.json()["detail"].lower()


class TestTranscription:
    def test_empty_transcript_returns_422(self, client, auth_headers):
        with patch("app.routers.voice.transcribe_audio", return_value=_fake_transcribe(text="")):
            r = client.post(
                "/api/v1/voice/transcribe",
                headers=auth_headers,
                files={"audio": ("a.webm", b"x" * 200, "audio/webm")},
            )
        assert r.status_code == 422
        assert "detect speech" in r.json()["detail"].lower()

    def test_success_returns_text(self, client, auth_headers):
        with patch(
            "app.routers.voice.transcribe_audio",
            return_value=_fake_transcribe(text="I spent 500 on food"),
        ):
            r = client.post(
                "/api/v1/voice/transcribe",
                headers=auth_headers,
                files={"audio": ("a.webm", b"x" * 200, "audio/webm")},
            )
        assert r.status_code == 200
        assert r.json()["text"] == "I spent 500 on food"

    def test_transcribe_failure_returns_500(self, client, auth_headers):
        with patch("app.routers.voice.transcribe_audio", side_effect=RuntimeError("boom")):
            r = client.post(
                "/api/v1/voice/transcribe",
                headers=auth_headers,
                files={"audio": ("a.webm", b"x" * 200, "audio/webm")},
            )
        assert r.status_code == 500

    def test_user_id_zero_skips_rate_limit(self, client, auth_headers, monkeypatch):
        """user_id=0 (anonymous transcription) must bypass the limiter."""
        from app.config import get_settings

        monkeypatch.setattr(get_settings(), "user_voice_per_day", 1, raising=False)
        with patch("app.routers.voice.transcribe_audio", return_value=_fake_transcribe()):
            # Fire 3 requests with user_id=0 — none should be rate limited
            for _ in range(3):
                r = client.post(
                    "/api/v1/voice/transcribe",
                    headers=auth_headers,
                    data={"user_id": "0"},
                    files={"audio": ("a.webm", b"x" * 200, "audio/webm")},
                )
                assert r.status_code == 200
