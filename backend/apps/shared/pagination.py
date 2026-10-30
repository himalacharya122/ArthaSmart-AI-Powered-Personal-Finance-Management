"""Custom pagination classes for Squirrel API."""

from rest_framework.pagination import PageNumberPagination  # type: ignore


class StandardPagination(PageNumberPagination):
    """Standard pagination with configurable page size.

    Defaults: 20 per page, max 100, client can request via ?page_size=
    """

    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100
