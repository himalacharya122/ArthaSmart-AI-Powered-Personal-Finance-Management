"""ArthaSmart AI Microservice — FastAPI entry point."""

import logging

from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore

from app.config import get_settings
from app.routers import chat, health, insights, voice

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title="ArthaSmart AI Service",
        description=(
            "AI microservice for ArthaSmart — handles chat processing, "
            "financial insights, anomaly detection, and voice interaction."
        ),
        version="1.0.0",
        docs_url="/docs",
        redoc_url="/redoc",
    )

    # CORS — only Django backend should call this service
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Routers
    app.include_router(health.router)
    app.include_router(chat.router)
    app.include_router(insights.router)
    app.include_router(voice.router)

    logger.info(
        "ArthaSmart AI Service started | model=%s | port=%s",
        settings.llm_model,
        settings.port,
    )

    return app


app = create_app()
