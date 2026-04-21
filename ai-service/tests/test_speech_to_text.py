"""Tests for the Whisper transcription wrapper."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest  # type: ignore

from app.services.speech_to_text import transcribe_audio


def _whisper_result(text: str = "hello", language: str = "en") -> MagicMock:
    m = MagicMock()
    m.text = text
    m.language = language
    return m


class TestTranscribeAudio:
    def test_calls_whisper_with_verbose_json_format(self, mock_groq_raw):
        mock_groq_raw.audio.transcriptions.create.return_value = _whisper_result()
        transcribe_audio(b"fake-bytes")
        kwargs = mock_groq_raw.audio.transcriptions.create.call_args.kwargs
        assert kwargs["response_format"] == "verbose_json"

    def test_language_passed_only_when_provided(self, mock_groq_raw):
        mock_groq_raw.audio.transcriptions.create.return_value = _whisper_result()
        transcribe_audio(b"x", language="ne")
        kwargs = mock_groq_raw.audio.transcriptions.create.call_args.kwargs
        assert kwargs["language"] == "ne"

    def test_language_omitted_by_default(self, mock_groq_raw):
        mock_groq_raw.audio.transcriptions.create.return_value = _whisper_result()
        transcribe_audio(b"x")
        kwargs = mock_groq_raw.audio.transcriptions.create.call_args.kwargs
        assert "language" not in kwargs

    def test_text_is_stripped(self, mock_groq_raw):
        mock_groq_raw.audio.transcriptions.create.return_value = _whisper_result(
            text="   hello world  \n"
        )
        r = transcribe_audio(b"x")
        assert r["text"] == "hello world"

    def test_default_language_fallback(self, mock_groq_raw):
        """If Whisper returns language=None, default to 'en'."""
        m = MagicMock()
        m.text = "hi"
        m.language = None
        mock_groq_raw.audio.transcriptions.create.return_value = m
        r = transcribe_audio(b"x")
        assert r["language"] == "en"

    def test_exceptions_are_propagated(self, mock_groq_raw):
        mock_groq_raw.audio.transcriptions.create.side_effect = RuntimeError("boom")
        with pytest.raises(RuntimeError):
            transcribe_audio(b"x")

    def test_filename_passed_to_whisper(self, mock_groq_raw):
        mock_groq_raw.audio.transcriptions.create.return_value = _whisper_result()
        transcribe_audio(b"audio", filename="voice.ogg")
        kwargs = mock_groq_raw.audio.transcriptions.create.call_args.kwargs
        assert kwargs["file"] == ("voice.ogg", b"audio")
