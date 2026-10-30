"""URL configuration for ArthaSmart."""

from django.conf import settings  # type: ignore
from django.conf.urls.static import static  # type: ignore
from django.contrib import admin  # type: ignore
from django.urls import include, path  # type: ignore
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView  # type: ignore

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/categories/", include("apps.categories.urls")),
    path("api/v1/expenses/", include("apps.expenses.urls")),
    path("api/v1/incomes/", include("apps.expenses.income_urls")),
    path("api/v1/recurring-transactions/", include("apps.expenses.recurring_urls")),
    path("api/v1/budgets/", include("apps.budgets.urls")),
    path("api/v1/receipts/", include("apps.receipts.urls")),
    path("api/v1/insights/", include("apps.ai_insights.urls")),
    path("api/v1/chat/", include("apps.chat.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    path("api/v1/reports/", include("apps.reports.urls")),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
]

# Serve uploaded media files (receipt images, etc.) in development.
# In production, a real web server (nginx / S3 / Cloudflare) handles /media/.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
