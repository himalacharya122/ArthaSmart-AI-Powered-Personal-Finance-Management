"""Execute AI-requested actions (CRUD on expenses, incomes, etc.)."""

import logging
from datetime import date

from django.db.models import Q  # type: ignore

logger = logging.getLogger(__name__)


def execute_actions(user, actions: list[dict]) -> dict:
    """Execute a list of AI actions and return results.

    Args:
        user: The Django User instance.
        actions: List of action dicts from AI service.
                 Each has: {"type": "create_expense", "data": {...}}

    Returns:
        {
            "executed": [...],  # Successfully executed actions with IDs
            "errors": [...],    # Failed actions with error messages
        }
    """
    from apps.categories.models import Category  # type: ignore
    from apps.expenses.models import Expense, Income  # type: ignore

    results = {"executed": [], "errors": []}

    for action in actions:
        action_type = action.get("type", "")
        data = action.get("data", {})

        try:
            if action_type == "create_expense":
                result = _create_expense(user, data)
                results["executed"].append({"type": action_type, **result})

            elif action_type == "create_income":
                result = _create_income(user, data)
                results["executed"].append({"type": action_type, **result})

            elif action_type == "update_expense":
                result = _update_expense(user, data)
                results["executed"].append({"type": action_type, **result})

            elif action_type == "delete_expense":
                result = _delete_expense(user, data)
                results["executed"].append({"type": action_type, **result})

            elif action_type == "update_income":
                result = _update_income(user, data)
                results["executed"].append({"type": action_type, **result})

            elif action_type == "delete_income":
                result = _delete_income(user, data)
                results["executed"].append({"type": action_type, **result})

            else:
                logger.warning("Unknown action type: %s", action_type)
                results["errors"].append({
                    "type": action_type,
                    "error": f"Unknown action type: {action_type}",
                })

        except Exception as exc:
            logger.error("Failed to execute %s: %s", action_type, exc)
            results["errors"].append({
                "type": action_type,
                "error": str(exc),
            })

    return results


def _resolve_category(name: str | None, cat_type: str = "expense"):
    """Find a category by name (case-insensitive, fuzzy match)."""
    from apps.categories.models import Category  # type: ignore

    if not name:
        return None

    # Exact match first
    cat = Category.objects.filter(name__iexact=name, type=cat_type).first()
    if cat:
        return cat

    # Partial match
    cat = Category.objects.filter(name__icontains=name, type=cat_type).first()
    if cat:
        return cat

    # Try slug match
    slug = name.lower().replace(" ", "-").replace("&", "and")
    cat = Category.objects.filter(slug__icontains=slug, type=cat_type).first()
    if cat:
        return cat

    logger.info("Category '%s' not found for type '%s'", name, cat_type)
    return None


def _create_expense(user, data: dict) -> dict:
    """Create an expense from AI action data."""
    from apps.expenses.models import Expense  # type: ignore

    amount = data.get("amount")
    if not amount or float(amount) <= 0:
        raise ValueError("Invalid expense amount")

    category = _resolve_category(data.get("category"), "expense")
    expense_date = data.get("date", date.today().isoformat())

    expense = Expense.objects.create(
        user=user,
        amount=amount,
        currency=user.preferred_currency,
        category=category,
        merchant=data.get("merchant", ""),
        description=data.get("description", ""),
        date=expense_date,
        source="chatbot",
    )

    logger.info("Created expense #%d: %s %s", expense.id, user.preferred_currency, amount)
    return {
        "id": expense.id,
        "amount": float(expense.amount),
        "category": category.name if category else None,
        "merchant": expense.merchant,
        "date": str(expense.date),
    }


def _create_income(user, data: dict) -> dict:
    """Create an income from AI action data."""
    from apps.expenses.models import Income  # type: ignore

    amount = data.get("amount")
    if not amount or float(amount) <= 0:
        raise ValueError("Invalid income amount")

    category = _resolve_category(data.get("category"), "income")
    income_date = data.get("date", date.today().isoformat())

    income = Income.objects.create(
        user=user,
        amount=amount,
        currency=user.preferred_currency,
        category=category,
        source_name=data.get("source_name", ""),
        description=data.get("description", ""),
        date=income_date,
    )

    logger.info("Created income #%d: %s %s", income.id, user.preferred_currency, amount)
    return {
        "id": income.id,
        "amount": float(income.amount),
        "category": category.name if category else None,
        "source_name": income.source_name,
        "date": str(income.date),
    }


def _update_expense(user, data: dict) -> dict:
    """Update an existing expense."""
    from apps.expenses.models import Expense  # type: ignore

    expense_id = data.get("expense_id")
    if not expense_id:
        raise ValueError("No expense_id provided")

    expense = Expense.objects.get(id=expense_id, user=user, is_deleted=False)

    if "amount" in data:
        expense.amount = data["amount"]
    if "category" in data:
        cat = _resolve_category(data["category"], "expense")
        if cat:
            expense.category = cat
    if "merchant" in data:
        expense.merchant = data["merchant"]
    if "description" in data:
        expense.description = data["description"]

    expense.save()
    logger.info("Updated expense #%d", expense.id)
    return {"id": expense.id, "updated_fields": [k for k in data if k != "expense_id"]}


def _delete_expense(user, data: dict) -> dict:
    """Soft-delete an expense."""
    from apps.expenses.models import Expense  # type: ignore

    expense_id = data.get("expense_id")
    if not expense_id:
        raise ValueError("No expense_id provided")

    expense = Expense.objects.get(id=expense_id, user=user, is_deleted=False)
    expense.is_deleted = True
    expense.save(update_fields=["is_deleted"])
    logger.info("Deleted expense #%d", expense.id)
    return {"id": expense.id, "deleted": True}


def _update_income(user, data: dict) -> dict:
    """Update an existing income."""
    from apps.expenses.models import Income  # type: ignore

    income_id = data.get("income_id")
    if not income_id:
        raise ValueError("No income_id provided")

    income = Income.objects.get(id=income_id, user=user, is_deleted=False)

    if "amount" in data:
        income.amount = data["amount"]
    if "source_name" in data:
        income.source_name = data["source_name"]
    if "description" in data:
        income.description = data["description"]

    income.save()
    logger.info("Updated income #%d", income.id)
    return {"id": income.id, "updated_fields": [k for k in data if k != "income_id"]}


def _delete_income(user, data: dict) -> dict:
    """Soft-delete an income."""
    from apps.expenses.models import Income  # type: ignore

    income_id = data.get("income_id")
    if not income_id:
        raise ValueError("No income_id provided")

    income = Income.objects.get(id=income_id, user=user, is_deleted=False)
    income.is_deleted = True
    income.save(update_fields=["is_deleted"])
    logger.info("Deleted income #%d", income.id)
    return {"id": income.id, "deleted": True}
