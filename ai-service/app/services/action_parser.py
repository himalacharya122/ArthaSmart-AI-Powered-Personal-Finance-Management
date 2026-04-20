"""Parse LLM tool calls into structured Action objects."""

from __future__ import annotations

import json
import logging

from app.schemas.chat import ActionData, MemoryUpdate

logger = logging.getLogger(__name__)


def parse_tool_calls(tool_calls: list[dict] | None) -> list[ActionData]:
    """Convert raw LLM tool calls into ActionData objects.

    Each tool call looks like:
    {
        "id": "call_abc123",
        "function": {
            "name": "create_expense",
            "arguments": '{"amount": 500, "category": "Food", "merchant": "KFC"}'
        }
    }
    """
    if not tool_calls:
        return []

    actions: list[ActionData] = []
    for tc in tool_calls:
        try:
            func = tc["function"]
            name = func["name"]
            args_str = func.get("arguments", "{}")

            # Parse the JSON arguments
            try:
                data = json.loads(args_str)
            except json.JSONDecodeError:
                logger.warning("Failed to parse tool arguments: %s", args_str)
                data = {}

            actions.append(ActionData(type=name, data=data))
        except (KeyError, TypeError) as exc:
            logger.warning("Failed to parse tool call: %s — %s", tc, exc)

    return actions


def extract_memory_updates(content: str | None) -> list[MemoryUpdate]:
    """Extract memory-worthy facts from the assistant's response.

    For now, this uses simple heuristics. In Phase 4, the LLM will be
    asked to explicitly output memory updates in a structured format.
    """
    if not content:
        return []

    updates: list[MemoryUpdate] = []

    # Simple keyword detection for goals
    goal_triggers = [
        "want to save",
        "goal is to",
        "trying to",
        "planning to",
        "would like to",
    ]
    for trigger in goal_triggers:
        if trigger in content.lower():
            # The full sentence containing the trigger
            for sentence in content.split("."):
                if trigger in sentence.lower():
                    updates.append(MemoryUpdate(type="goal", content=sentence.strip()))
                    break

    return updates


def detect_intent(
    tool_calls: list[dict] | None,
    content: str | None,
    user_message: str,
) -> str:
    """Determine the intent of the interaction.

    If tools were called, the intent comes from the tool name.
    Otherwise, classify based on content analysis.
    """
    if tool_calls:
        first_tool = tool_calls[0]["function"]["name"]
        intent_map = {
            "create_expense": "add_expense",
            "create_income": "add_income",
            "update_expense": "edit_expense",
            "delete_expense": "delete_expense",
            "update_income": "edit_income",
            "delete_income": "delete_income",
        }
        return intent_map.get(first_tool, "general")

    # Keyword-based intent detection for non-tool responses
    msg_lower = user_message.lower()

    if any(kw in msg_lower for kw in ["how much", "spent", "spending", "expense"]):
        return "query_spending"
    if any(kw in msg_lower for kw in ["balance", "left", "remaining", "net"]):
        return "query_balance"
    if any(kw in msg_lower for kw in ["budget", "limit", "allocated"]):
        return "query_budget"
    if any(kw in msg_lower for kw in ["tip", "advice", "suggest", "insight", "save"]):
        return "get_insight"

    return "general"
