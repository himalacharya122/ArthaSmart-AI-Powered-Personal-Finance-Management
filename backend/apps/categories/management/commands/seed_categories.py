"""Management command to seed system default categories."""

from django.core.management.base import BaseCommand  # type: ignore
from django.utils.text import slugify  # type: ignore

from apps.categories.models import Category

# Nepal-relevant defaults with Lucide icon names
EXPENSE_CATEGORIES = [
    {"name": "Food & Dining", "icon": "utensils", "color": "#F59E0B"},
    {"name": "Transportation", "icon": "car", "color": "#3B82F6"},
    {"name": "Housing & Rent", "icon": "home", "color": "#8B5CF6"},
    {"name": "Utilities", "icon": "zap", "color": "#EF4444"},
    {"name": "Groceries", "icon": "shopping-cart", "color": "#10B981"},
    {"name": "Healthcare", "icon": "heart-pulse", "color": "#EC4899"},
    {"name": "Education", "icon": "graduation-cap", "color": "#6366F1"},
    {"name": "Entertainment", "icon": "film", "color": "#F97316"},
    {"name": "Shopping", "icon": "shopping-bag", "color": "#14B8A6"},
    {"name": "Communication", "icon": "phone", "color": "#06B6D4"},
    {"name": "Insurance", "icon": "shield", "color": "#64748B"},
    {"name": "Personal Care", "icon": "scissors", "color": "#D946EF"},
    {"name": "Gifts & Donations", "icon": "gift", "color": "#F43F5E"},
    {"name": "Travel", "icon": "plane", "color": "#0EA5E9"},
    {"name": "Subscriptions", "icon": "repeat", "color": "#7C3AED"},
    {"name": "Other Expense", "icon": "circle-dot", "color": "#94A3B8"},
]

INCOME_CATEGORIES = [
    {"name": "Salary", "icon": "banknote", "color": "#22C55E"},
    {"name": "Freelance", "icon": "laptop", "color": "#3B82F6"},
    {"name": "Business", "icon": "briefcase", "color": "#8B5CF6"},
    {"name": "Investments", "icon": "trending-up", "color": "#F59E0B"},
    {"name": "Rental Income", "icon": "building", "color": "#14B8A6"},
    {"name": "Allowance", "icon": "wallet", "color": "#EC4899"},
    {"name": "Gifts Received", "icon": "gift", "color": "#F43F5E"},
    {"name": "Other Income", "icon": "circle-dot", "color": "#94A3B8"},
]


class Command(BaseCommand):
    help = "Seed system default categories for expenses and incomes"

    def handle(self, *args, **options):
        created_count = 0

        for cat_data in EXPENSE_CATEGORIES:
            _, created = Category.objects.get_or_create(
                slug=slugify(cat_data["name"]),
                type="expense",
                is_default=True,
                defaults={
                    "name": cat_data["name"],
                    "icon": cat_data["icon"],
                    "color": cat_data["color"],
                    "user": None,
                },
            )
            if created:
                created_count += 1

        for cat_data in INCOME_CATEGORIES:
            _, created = Category.objects.get_or_create(
                slug=slugify(cat_data["name"]),
                type="income",
                is_default=True,
                defaults={
                    "name": cat_data["name"],
                    "icon": cat_data["icon"],
                    "color": cat_data["color"],
                    "user": None,
                },
            )
            if created:
                created_count += 1

        total = len(EXPENSE_CATEGORIES) + len(INCOME_CATEGORIES)
        self.stdout.write(
            self.style.SUCCESS(
                f"Done. Created {created_count} new categories "
                f"({total - created_count} already existed)."
            )
        )
