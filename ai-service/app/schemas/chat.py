"""Chat request and response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field  # type: ignore

# User Context (sent by Django with every chat request)


class BudgetContext(BaseModel):
    """Active budget summary."""

    name: str
    category: str = ""
    amount: float
    spent: float
    remaining: float
    percentage_used: float


class CategorySpending(BaseModel):
    """Spending breakdown per category."""

    name: str
    total: float
    count: int


class RecentTransaction(BaseModel):
    """A recent expense or income."""

    id: int
    type: str = "expense"  # "expense" or "income"
    description: str = ""
    merchant: str = ""
    source_name: str = ""
    amount: float
    category: str = ""
    date: str


class UserContext(BaseModel):
    """Financial context about the user — injected into every AI request."""

    user_id: int
    first_name: str = ""
    preferred_currency: str = "NPR"
    total_income_this_month: float = 0
    total_expenses_this_month: float = 0
    savings_rate: float = 0
    active_budgets: list[BudgetContext] = Field(default_factory=list)
    top_categories: list[CategorySpending] = Field(default_factory=list)
    recent_transactions: list[RecentTransaction] = Field(default_factory=list)
    category_list: list[str] = Field(
        default_factory=list,
        description="Available expense categories for the user",
    )


class UserMemory(BaseModel):
    """Accumulated AI knowledge about a user (from UserAIMemory model)."""

    financial_personality: str = ""
    facts: list[str] = Field(default_factory=list)
    goals: list[str] = Field(default_factory=list)
    spending_patterns: dict = Field(default_factory=dict)
    conversation_summary: str = ""


class ConversationMessage(BaseModel):
    """A single message in conversation history."""

    role: str  # "user", "assistant", "system"
    content: str


# Request


class ChatRequest(BaseModel):
    """Incoming chat request from Django."""

    message: str = Field(..., min_length=1, max_length=4000)
    conversation_id: int
    user_context: UserContext
    user_memory: UserMemory = Field(default_factory=UserMemory)
    conversation_history: list[ConversationMessage] = Field(default_factory=list)


# Response


class ActionData(BaseModel):
    """Data for a CRUD action the AI wants to perform."""

    type: str = Field(
        ...,
        description=(
            "Action type: create_expense, update_expense, delete_expense, "
            "create_income, update_income, delete_income, create_recurring"
        ),
    )
    data: dict = Field(
        default_factory=dict,
        description="Action payload: {amount, category, merchant, date, description, ...}",
    )


class MemoryUpdate(BaseModel):
    """A new fact or goal the AI learned from this conversation."""

    type: str = "fact"  # "fact" or "goal"
    content: str


class ChatResponse(BaseModel):
    """AI response sent back to Django."""

    reply: str = Field(..., description="The assistant's text response")
    intent: str = Field(
        default="general",
        description="Detected intent: add_expense, add_income, edit_expense, "
        "delete_expense, query_spending, query_balance, query_budget, "
        "get_insight, general",
    )
    actions: list[ActionData] = Field(
        default_factory=list,
        description="CRUD actions to execute",
    )
    memory_updates: list[MemoryUpdate] = Field(
        default_factory=list,
        description="New facts/goals learned from this conversation",
    )
    tokens_used: int = 0
    response_time_ms: int = 0
