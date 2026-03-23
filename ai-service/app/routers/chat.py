"""Chat processing endpoint — the core AI brain."""

from __future__ import annotations

import logging
import time

from fastapi import APIRouter, Depends # type: ignore

from app.core.security import verify_service_key
from app.schemas.chat import ChatRequest, ChatResponse
from app.services.action_parser import (
    detect_intent,
    extract_memory_updates,
    parse_tool_calls,
)
from app.services.groq_client import chat_completion
from app.services.prompt_builder import build_messages, build_system_prompt
from app.services.tool_definitions import TOOLS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post(
    "/chat",
    response_model=ChatResponse,
    dependencies=[Depends(verify_service_key)],
)
async def process_chat(request: ChatRequest) -> ChatResponse:
    """Process a user message and return AI response with actions.

    Flow:
    1. Build system prompt with user context + memory
    2. Build message list with conversation history
    3. Call Groq LLM with tool definitions
    4. Parse tool calls --> actions
    5. Handle tool calls: if tools were called, run a second LLM call
       with tool results to get a natural language reply
    6. Extract memory updates
    7. Return structured response
    """
    start = time.perf_counter()

    # 1. Build system prompt
    system_prompt = build_system_prompt(request.user_context, request.user_memory)

    # 2. Build messages
    history = [
        {"role": m.role, "content": m.content}
        for m in request.conversation_history
    ]
    messages = build_messages(system_prompt, history, request.message)

    # 3. Call LLM with tools
    result = chat_completion(messages=messages, tools=TOOLS)

    content = result["content"]
    tool_calls = result["tool_calls"]
    total_tokens = result["tokens_used"]

    # 4. Parse tool calls into actions
    actions = parse_tool_calls(tool_calls)

    # 5. If tools were called, we need a follow-up to get a human-readable reply
    if tool_calls and not content:
        # Build tool result messages to feed back
        tool_messages = list(messages)
        # Add the assistant's tool call message
        tool_messages.append(
            {
                "role": "assistant",
                "content": None,
                "tool_calls": tool_calls,
            }
        )
        # Add tool results (simulated — Django will execute the real actions)
        for tc in tool_calls:
            func_name = tc["function"]["name"]
            tool_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": f"Action '{func_name}' will be executed by the system. "
                    f"Confirm to the user what was done.",
                }
            )

        # Second LLM call for natural language reply
        followup = chat_completion(messages=tool_messages)
        content = followup["content"] or "Done!"
        total_tokens += followup["tokens_used"]

    # 6. Detect intent
    intent = detect_intent(tool_calls, content, request.message)

    # 7. Extract memory updates
    memory_updates = extract_memory_updates(content)

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    return ChatResponse(
        reply=content or "I'm not sure how to respond to that. Could you try rephrasing?",
        intent=intent,
        actions=actions,
        memory_updates=memory_updates,
        tokens_used=total_tokens,
        response_time_ms=elapsed_ms,
    )
