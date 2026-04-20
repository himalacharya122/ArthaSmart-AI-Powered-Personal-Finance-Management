"""Reports, dashboard, audit logs, and currency URL configuration."""

from django.urls import include, path  # type: ignore
from rest_framework.routers import DefaultRouter  # type: ignore

from .views import (
    AuditLogViewSet,
    CurrencyConvertView,
    CurrencyRateListView,
    DashboardView,
    ExportView,
    IncomeVsExpenseView,
    SpendingByCategoryView,
)

app_name = "reports"

router = DefaultRouter()
router.register("audit-logs", AuditLogViewSet, basename="audit-log")

urlpatterns = [
    # Dashboard & analytics
    path("dashboard/", DashboardView.as_view(), name="dashboard"),
    path("spending-by-category/", SpendingByCategoryView.as_view(), name="spending-by-category"),
    path("income-vs-expense/", IncomeVsExpenseView.as_view(), name="income-vs-expense"),
    path("export/", ExportView.as_view(), name="export"),
    # Currency
    path("currency/rates/", CurrencyRateListView.as_view(), name="currency-rates"),
    path("currency/convert/", CurrencyConvertView.as_view(), name="currency-convert"),
    # Audit logs (router)
    path("", include(router.urls)),
]
