"""Schemas for insight generation and anomaly detection."""

from __future__ import annotations

from pydantic import BaseModel, Field # type: ignore


class CategorySpending(BaseModel):
    """Category spending summary."""
    name: str
    total: float
    count: int
    avg_per_transaction: float = 0.0


class MonthlyTotal(BaseModel):
    """Monthly income/expense total."""
    month: str
    income: float = 0.0
    expense: float = 0.0


class InsightRequest(BaseModel):
    """Request to generate insights for a user."""
    user_id: int
    first_name: str = ""
    preferred_currency: str = "NPR"
    total_income_this_month: float = 0.0
    total_expenses_this_month: float = 0.0
    savings_rate: float = 0.0
    categories: list[CategorySpending] = []
    monthly_history: list[MonthlyTotal] = []
    active_budgets: list[dict] = []
    user_memory: dict = Field(default_factory=dict)


class InsightItem(BaseModel):
    """A single AI-generated insight."""
    insight_type: str  # spending_pattern, anomaly, prediction, suggestion
    severity: str = "info"  # info, warning, critical
    title: str
    description: str
    data: dict = Field(default_factory=dict)


class InsightResponse(BaseModel):
    """Response from insight generation."""
    insights: list[InsightItem]
    tokens_used: int = 0
    response_time_ms: int = 0


class AnomalyCheckRequest(BaseModel):
    """Request to check if an expense is anomalous."""
    expense_amount: float
    expense_category: str
    expense_merchant: str = ""
    expense_description: str = ""
    preferred_currency: str = "NPR"
    category_avg: float = 0.0
    category_std: float = 0.0
    category_count: int = 0
    recent_category_expenses: list[float] = []


class AnomalyCheckResponse(BaseModel):
    """Anomaly detection result."""
    is_anomaly: bool = False
    confidence: float = 0.0  # 0-1
    reason: str = ""
    suggestion: str = ""
    tokens_used: int = 0


class MemoryUpdateRequest(BaseModel):
    """Request to analyze spending patterns and update user memory."""
    user_id: int
    first_name: str = ""
    preferred_currency: str = "NPR"
    total_income_30d: float = 0.0
    total_expenses_30d: float = 0.0
    categories: list[CategorySpending] = []
    daily_expenses: list[dict] = []  # {date, total}
    top_merchants: list[dict] = []  # {name, total, count}
    existing_memory: dict = Field(default_factory=dict)


class MemoryUpdateResponse(BaseModel):
    """Updated user memory from analysis."""
    financial_personality: str = ""
    spending_patterns: dict = Field(default_factory=dict)
    new_facts: list[str] = []
    conversation_summary: str = ""
    tokens_used: int = 0
