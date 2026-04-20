"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings  # type: ignore


class Settings(BaseSettings):
    """AI service settings — loaded from .env file or environment."""

    # Groq Cloud (OpenAI-compatible)
    groq_api_key: str = ""
    groq_base_url: str = "https://api.groq.com/openai/v1"

    # Models
    llm_model: str = "llama-3.3-70b-versatile"
    llm_model_fallback: str = "llama-3.1-8b-instant"
    stt_model: str = "whisper-large-v3-turbo"
    tts_model: str = "playai-tts"
    tts_voice: str = "Fritz-PlayAI"

    # LLM parameters
    llm_max_tokens: int = 1024
    llm_temperature: float = 0.7
    max_conversation_history: int = 10
    max_memory_facts: int = 50

    # Service-to-service auth (override via SERVICE_SECRET_KEY env var)
    service_secret_key: str = "artha-ai-service-key-change-in-production"  # noqa: S105

    # Rate limits
    user_messages_per_minute: int = 15
    user_messages_per_day: int = 300
    user_voice_per_day: int = 50

    # Server - bind all interfaces so the container is reachable from the host
    host: str = "0.0.0.0"  # noqa: S104
    port: int = 8001

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Cached settings singleton."""
    return Settings()
