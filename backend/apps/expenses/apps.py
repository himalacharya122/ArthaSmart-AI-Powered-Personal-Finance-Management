from django.apps import AppConfig  # type: ignore


class ExpensesConfig(AppConfig):
    name = "apps.expenses"

    def ready(self):
        import apps.expenses.signals  # noqa: F401
