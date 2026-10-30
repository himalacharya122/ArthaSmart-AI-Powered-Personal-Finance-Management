"""Shared schema definitions."""

from pydantic import BaseModel  # type: ignore


class HealthResponse(BaseModel):
    """Health check response."""

    status: str = "ok"
    service: str = "squirrel-ai"
    model: str = ""
    version: str = "1.0.0"


class ErrorResponse(BaseModel):
    """Standard error response."""

    error: str
    detail: str = ""
