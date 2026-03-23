"""Service-to-service authentication."""

from fastapi import Header, HTTPException, status # type: ignore

from app.config import get_settings


async def verify_service_key(
    x_service_key: str = Header(..., alias="X-Service-Key"),
) -> str:
    """Validate the service-to-service secret key from Django."""
    settings = get_settings()
    if x_service_key != settings.service_secret_key:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid service key",
        )
    return x_service_key
