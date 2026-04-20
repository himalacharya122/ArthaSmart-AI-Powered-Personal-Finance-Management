"""Custom exception handler for consistent API error responses."""

from rest_framework.views import exception_handler  # type: ignore


def custom_exception_handler(exc, context):
    """Wrap DRF exceptions into a consistent format.

    - Validation errors → {"errors": {"field": ["msg"]}}
    - Other errors → {"detail": "msg", "code": "error_code"}
    """
    response = exception_handler(exc, context)

    if response is None:
        return response

    # Validation errors (400) come as a dict of field --> [messages].
    # If it already has "detail", leave it; otherwise wrap in "errors".
    if (
        response.status_code == 400
        and isinstance(response.data, dict)
        and "detail" not in response.data
    ):
        response.data = {"errors": response.data}

    return response
