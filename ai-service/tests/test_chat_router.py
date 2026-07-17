"""Integration tests for the /api/v1/chat endpoint.

The LLM is fully mocked via the `mock_chat_completion` fixture. We're
verifying the router orchestration: prompt build → LLM → tool flow →
clean reply → actions/memory extraction.
"""

from __future__ import annotations

from fastapi.testclient import TestClient  # type: ignore


def _payload(message: str = "hi") -> dict:
    return {
        "message": message,
        "conversation_id": 1,
        "user_context": {"user_id": 1, "first_name": "Himal"},
        "user_memory": {},
        "conversation_history": [],
    }


class TestAuthAndRateLimit:
    def test_missing_key_returns_422(self, client: TestClient):
        r = client.post("/api/v1/chat", json=_payload())
        assert r.status_code == 422

    def test_wrong_key_returns_403(self, client: TestClient):
        r = client.post(
            "/api/v1/chat",
            headers={"X-Service-Key": "nope"},
            json=_payload(),
        )
        assert r.status_code == 403

    def test_rate_limit_429(self, client, auth_headers, mock_chat_completion, monkeypatch):
        from app.config import get_settings

        monkeypatch.setattr(get_settings(), "user_messages_per_minute", 1, raising=False)
        # First call succeeds
        r1 = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert r1.status_code == 200
        # Second call exceeds
        r2 = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert r2.status_code == 429


class TestPlainReply:
    def test_plain_llm_reply_returned_as_is(
        self, client, auth_headers, mock_chat_completion, make_llm_result
    ):
        mock_chat_completion.return_value = make_llm_result(content="Hello Himal!")
        r = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert r.status_code == 200
        body = r.json()
        assert body["reply"] == "Hello Himal!"
        assert body["actions"] == []
        assert body["intent"] == "general"
        assert mock_chat_completion.call_count == 1

    def test_empty_content_uses_fallback_message(
        self, client, auth_headers, mock_chat_completion, make_llm_result
    ):
        mock_chat_completion.return_value = make_llm_result(content="", tokens=5)
        r = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert r.status_code == 200
        assert "rephrasing" in r.json()["reply"]


class TestReplyCleaning:
    def test_system_tags_are_stripped(
        self, client, auth_headers, mock_chat_completion, make_llm_result
    ):
        mock_chat_completion.return_value = make_llm_result(
            content="Okay! [SYSTEM: internal note] That's done."
        )
        r = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert "[SYSTEM:" not in r.json()["reply"]

    def test_memory_extraction_block_stripped(
        self, client, auth_headers, mock_chat_completion, make_llm_result
    ):
        mock_chat_completion.return_value = make_llm_result(
            content="Got it!\n\nMEMORY EXTRACTION: user likes momos"
        )
        r = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert "MEMORY EXTRACTION" not in r.json()["reply"]

    def test_triple_newlines_collapsed(
        self, client, auth_headers, mock_chat_completion, make_llm_result
    ):
        mock_chat_completion.return_value = make_llm_result(content="Line1\n\n\n\n\nLine2")
        r = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert "\n\n\n" not in r.json()["reply"]


class TestToolCallFlow:
    def test_tool_call_triggers_second_llm_call_and_actions(
        self, client, auth_headers, mock_chat_completion, make_llm_result
    ):
        tool_calls = [
            {
                "id": "c1",
                "type": "function",
                "function": {
                    "name": "create_expense",
                    "arguments": '{"amount": 500, "category": "Food"}',
                },
            }
        ]
        # First LLM call returns tool_calls. Second (follow-up) returns final reply.
        mock_chat_completion.side_effect = [
            make_llm_result(content=None, tool_calls=tool_calls, tokens=50),
            make_llm_result(content="I'll log Rs. 500 for Food. Please confirm!", tokens=20),
        ]
        r = client.post(
            "/api/v1/chat",
            headers=auth_headers,
            json=_payload("I spent 500 on food"),
        )
        assert r.status_code == 200
        body = r.json()
        assert len(body["actions"]) == 1
        assert body["actions"][0]["type"] == "create_expense"
        assert body["actions"][0]["data"]["amount"] == 500
        assert body["intent"] == "add_expense"
        assert "confirm" in body["reply"].lower()
        assert mock_chat_completion.call_count == 2
        # Tokens should accumulate
        assert body["tokens_used"] == 70

    def test_tool_call_with_empty_followup_falls_back_to_done(
        self, client, auth_headers, mock_chat_completion, make_llm_result
    ):
        tool_calls = [
            {
                "id": "c1",
                "type": "function",
                "function": {"name": "create_expense", "arguments": "{}"},
            }
        ]
        mock_chat_completion.side_effect = [
            make_llm_result(content=None, tool_calls=tool_calls),
            make_llm_result(content=None),  # follow-up empty
        ]
        r = client.post("/api/v1/chat", headers=auth_headers, json=_payload())
        assert r.status_code == 200
        assert r.json()["reply"] == "Done!"
