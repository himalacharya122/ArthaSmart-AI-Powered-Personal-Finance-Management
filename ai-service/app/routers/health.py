"""Health check endpoint."""

from fastapi import APIRouter  # type: ignore

from app.config import get_settings
from app.schemas.common import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Service health check with model info."""
    settings = get_settings()
    return HealthResponse(
        status="ok",
        service="squirrel-ai",
        model=settings.llm_model,
        version="1.0.0",
    )
