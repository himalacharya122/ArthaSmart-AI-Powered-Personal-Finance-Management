"""LLM tool/function definitions for CRUD operations.

These tell the LLM what actions it can take on behalf of the user.
The LLM decides when to call a tool based on the user's message.
"""

TOOLS: list[dict] = [
    {
        "type": "function",
        "function": {
            "name": "create_expense",
            "description": (
                "Create a new expense record for the user. Use this when the user "
                "mentions spending money, making a purchase, paying for something, "
                "or logging an expense."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "The amount spent (positive number)",
                    },
                    "category": {
                        "type": "string",
                        "description": (
                            "Expense category name (e.g., 'Food & Dining', 'Transport', "
                            "'Shopping', 'Utilities'). Match to the user's available categories."
                        ),
                    },
                    "merchant": {
                        "type": "string",
                        "description": "Name of the store, restaurant, or service provider",
                    },
                    "description": {
                        "type": "string",
                        "description": "Brief description of what was purchased",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date of expense in YYYY-MM-DD format. Use today if not specified.",
                    },
                },
                "required": ["amount"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_income",
            "description": (
                "Create a new income record for the user. Use this when the user "
                "mentions receiving money, getting paid, salary, freelance income, etc."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "amount": {
                        "type": "number",
                        "description": "The income amount (positive number)",
                    },
                    "source_name": {
                        "type": "string",
                        "description": "Source of income (e.g., 'Salary', 'Freelance', 'Monthly Salary')",
                    },
                    "category": {
                        "type": "string",
                        "description": "Income category name (e.g., 'Salary', 'Freelance', 'Investment')",
                    },
                    "description": {
                        "type": "string",
                        "description": "Brief description of the income",
                    },
                    "date": {
                        "type": "string",
                        "description": "Date of income in YYYY-MM-DD format. Use today if not specified.",
                    },
                },
                "required": ["amount", "source_name"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_expense",
            "description": (
                "Update an existing expense. Use when the user wants to change the "
                "amount, category, merchant, or description of a previously logged expense."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "expense_id": {
                        "type": "integer",
                        "description": "ID of the expense to update (from recent transactions)",
                    },
                    "amount": {
                        "type": "number",
                        "description": "New amount (if changing)",
                    },
                    "category": {
                        "type": "string",
                        "description": "New category name (if changing)",
                    },
                    "merchant": {
                        "type": "string",
                        "description": "New merchant name (if changing)",
                    },
                    "description": {
                        "type": "string",
                        "description": "New description (if changing)",
                    },
                },
                "required": ["expense_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_expense",
            "description": (
                "Delete an expense. Use when the user wants to remove a previously "
                "logged expense. Confirm with the user before deleting."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "expense_id": {
                        "type": "integer",
                        "description": "ID of the expense to delete",
                    },
                    "reason": {
                        "type": "string",
                        "description": "Reason for deletion (optional)",
                    },
                },
                "required": ["expense_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_income",
            "description": "Update an existing income record.",
            "parameters": {
                "type": "object",
                "properties": {
                    "income_id": {
                        "type": "integer",
                        "description": "ID of the income to update",
                    },
                    "amount": {"type": "number", "description": "New amount"},
                    "source_name": {"type": "string", "description": "New source name"},
                    "description": {"type": "string", "description": "New description"},
                },
                "required": ["income_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "delete_income",
            "description": "Delete an income record.",
            "parameters": {
                "type": "object",
                "properties": {
                    "income_id": {
                        "type": "integer",
                        "description": "ID of the income to delete",
                    },
                },
                "required": ["income_id"],
            },
        },
    },
]
