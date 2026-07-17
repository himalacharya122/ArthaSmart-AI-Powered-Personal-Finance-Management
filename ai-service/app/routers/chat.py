"""Chat processing endpoint - the core AI brain."""

from __future__ import annotations

import json
import logging
import re
import time
import uuid

from fastapi import APIRouter, Depends  # type: ignore

from app.core.rate_limiter import rate_limiter
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

# Patterns to strip from AI reply (metadata that leaks into visible text)
_CLEANUP_PATTERNS = [
    re.compile(r"\[SYSTEM:.*?\]", re.DOTALL),
    re.compile(r"MEMORY EXTRACTION:.*?(?=\n\n|\Z)", re.DOTALL),
    re.compile(r"\*\*MEMORY EXTRACTION\*\*:.*?(?=\n\n|\Z)", re.DOTALL),
    # Raw function call blobs that some models write in text instead of as tool calls
    re.compile(r"<function=\w+>.*?</function>", re.DOTALL),
    re.compile(r"<function_calls>.*?</function_calls>", re.DOTALL),
    re.compile(r"<invoke>.*?</invoke>", re.DOTALL),
    # Bare JSON that sometimes follows a leaked function name line
    re.compile(r"^<function=.*$", re.MULTILINE),
]

# Pattern to extract text-format tool calls written by the LLM in content instead of tool_calls
_TEXT_TOOL_CALL_PATTERN = re.compile(
    r"<function=(\w+)>(.*?)</function>",
    re.DOTALL,
)


def _clean_reply(text: str) -> str:
    """Remove leaked metadata/system tags from the AI reply."""
    for pattern in _CLEANUP_PATTERNS:
        text = pattern.sub("", text)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _extract_text_tool_calls(content: str) -> list[dict]:
    """Fallback: extract tool calls written as raw text by the LLM.

    Some Groq models occasionally write tool calls in the content as
    <function=name>{...}</function> instead of using the structured
    tool_calls API field. This extracts them so actions are not lost.
    """
    matches = _TEXT_TOOL_CALL_PATTERN.findall(content)
    extracted = []
    for func_name, args_str in matches:
        args_str = args_str.strip()
        try:
            json.loads(args_str)  # validate JSON
        except (json.JSONDecodeError, ValueError):
            logger.warning("Text tool call had invalid JSON for %s: %s", func_name, args_str[:100])
            continue
        extracted.append(
            {
                "id": f"tc_{uuid.uuid4().hex[:8]}",
                "type": "function",
                "function": {
                    "name": func_name,
                    "arguments": args_str,
                },
            }
        )
    if extracted:
        logger.info("Extracted %d text-format tool call(s) from LLM content", len(extracted))
    return extracted


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
    3b. Fallback: if LLM wrote tool calls as text, extract them
    4. Parse tool calls --> actions
    5. Handle tool calls: if tools were called, run a second LLM call
       with tool results to get a natural language "please confirm" reply
    6. Extract memory updates
    7. Return structured response
    """
    start = time.perf_counter()

    # 0. Rate limit check
    rate_limiter.check_chat(request.user_context.user_id)

    # 1. Build system prompt
    system_prompt = build_system_prompt(request.user_context, request.user_memory)

    # 2. Build messages
    history = [{"role": m.role, "content": m.content} for m in request.conversation_history]
    messages = build_messages(system_prompt, history, request.message)

    # 3. Call LLM with tools
    result = chat_completion(messages=messages, tools=TOOLS)

    content = result["content"]
    tool_calls = result["tool_calls"]
    total_tokens = result["tokens_used"]

    # 3b. Fallback: if the LLM wrote tool calls as raw text instead of structured tool_calls,
    #     extract them before cleaning so the actions are not silently lost.
    if not tool_calls and content:
        text_tool_calls = _extract_text_tool_calls(content)
        if text_tool_calls:
            tool_calls = text_tool_calls

    # 4. Parse tool calls into actions
    actions = parse_tool_calls(tool_calls)

    # 5. If tools were called, get a clean "please confirm" follow-up reply.
    #    The tool result message must be unambiguous: the action is PENDING, not done.
    if tool_calls:
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
        # Add tool results - explicitly tell the model the action is PENDING, not executed
        for tc in tool_calls:
            func_name = tc["function"]["name"]
            tool_messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tc["id"],
                    "content": f"Action '{func_name}' is queued and will be shown to the user as a "
                    f"pending action card with Confirm/Cancel buttons. "
                    f"Write a brief, friendly confirmation message. "
                    f"Do NOT include any [SYSTEM:] tags or metadata.",
                }
            )

        # Second LLM call for natural language reply (no tools this time)
        followup = chat_completion(messages=tool_messages)
        content = followup["content"] or "Done!"
        total_tokens += followup["tokens_used"]

    # 6. Clean the reply - strip any leaked metadata
    content = _clean_reply(content or "")

    # 7. Detect intent
    intent = detect_intent(tool_calls, content, request.message)

    # 8. Extract memory updates
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
