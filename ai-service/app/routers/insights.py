"""Insight generation and anomaly detection endpoints."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends  # type: ignore

from app.core.security import verify_service_key
from app.schemas.insights import (
    AnomalyCheckRequest,
    AnomalyCheckResponse,
    InsightRequest,
    InsightResponse,
    MemoryUpdateRequest,
    MemoryUpdateResponse,
)
from app.services.anomaly_detector import check_anomaly
from app.services.insight_engine import generate_insights
from app.services.memory_manager import analyze_and_update_memory

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["intelligence"])


@router.post("/insights/generate", response_model=InsightResponse)
async def generate_insights_endpoint(
    request: InsightRequest,
    _: str = Depends(verify_service_key),
):
    """Generate personalized financial insights for a user.

    Called by Django periodically or on-demand.
    """
    logger.info("Generating insights for user %d", request.user_id)
    return generate_insights(request)


@router.post("/anomaly/check", response_model=AnomalyCheckResponse)
async def check_anomaly_endpoint(
    request: AnomalyCheckRequest,
    _: str = Depends(verify_service_key),
):
    """Check if an expense is anomalous.

    Called by Django when a new expense is created.
    """
    logger.info(
        "Anomaly check: %s %s %.2f",
        request.expense_category,
        request.expense_merchant,
        request.expense_amount,
    )
    return check_anomaly(request)


@router.post("/memory/analyze", response_model=MemoryUpdateResponse)
async def analyze_memory_endpoint(
    request: MemoryUpdateRequest,
    _: str = Depends(verify_service_key),
):
    """Analyze spending patterns and update user memory.

    Called by Django weekly background task.
    """
    logger.info("Memory analysis for user %d", request.user_id)
    return analyze_and_update_memory(request)
