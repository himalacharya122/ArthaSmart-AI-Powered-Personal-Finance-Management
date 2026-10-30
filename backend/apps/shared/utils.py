"""Shared utility functions for Squirrel API."""

import secrets


def generate_api_key(prefix="ask", length=40):
    """Generate a secure API key with a prefix.

    Example: ask_a1b2c3d4e5f6...
    """
    token = secrets.token_hex(length // 2)
    return f"{prefix}_{token}"


def get_client_ip(request):
    """Extract client IP from request, handling proxies."""
    x_forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded:
        return x_forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")
