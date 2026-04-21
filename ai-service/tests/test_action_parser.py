"""Tests for action_parser — pure logic, no LLM.

This is a high-value test target: it's the layer that translates LLM
output into CRUD actions Django will execute. Bugs here = wrong data
written to users' accounts.
"""

from __future__ import annotations

from app.services.action_parser import (
    detect_intent,
    extract_memory_updates,
    parse_tool_calls,
)


class TestParseToolCalls:
    def test_none_returns_empty_list(self):
        assert parse_tool_calls(None) == []

    def test_empty_list_returns_empty_list(self):
        assert parse_tool_calls([]) == []

    def test_valid_single_tool_call(self):
        tcs = [
            {
                "id": "call_1",
                "function": {
                    "name": "create_expense",
                    "arguments": '{"amount": 500, "category": "Food"}',
                },
            }
        ]
        actions = parse_tool_calls(tcs)
        assert len(actions) == 1
        assert actions[0].type == "create_expense"
        assert actions[0].data == {"amount": 500, "category": "Food"}

    def test_multiple_tool_calls(self):
        tcs = [
            {
                "id": "c1",
                "function": {"name": "create_expense", "arguments": '{"amount": 100}'},
            },
            {
                "id": "c2",
                "function": {
                    "name": "create_income",
                    "arguments": '{"amount": 5000, "source_name": "Salary"}',
                },
            },
        ]
        actions = parse_tool_calls(tcs)
        assert [a.type for a in actions] == ["create_expense", "create_income"]

    def test_malformed_json_arguments_yield_empty_data(self):
        """Invalid JSON should not blow up — data={} and a warning logged."""
        tcs = [
            {
                "id": "c1",
                "function": {
                    "name": "create_expense",
                    "arguments": "not valid json {{",
                },
            }
        ]
        actions = parse_tool_calls(tcs)
        assert len(actions) == 1
        assert actions[0].data == {}

    def test_missing_function_key_is_skipped(self):
        """A completely malformed tool_call shouldn't crash the whole parse."""
        tcs = [
            {"id": "bad", "nope": "no function key"},
            {
                "id": "good",
                "function": {"name": "create_expense", "arguments": '{"amount": 1}'},
            },
        ]
        actions = parse_tool_calls(tcs)
        assert len(actions) == 1
        assert actions[0].type == "create_expense"

    def test_missing_arguments_defaults_to_empty_object(self):
        tcs = [{"id": "c1", "function": {"name": "create_expense"}}]
        actions = parse_tool_calls(tcs)
        assert actions[0].data == {}


class TestExtractMemoryUpdates:
    def test_none_content_returns_empty(self):
        assert extract_memory_updates(None) == []

    def test_empty_content_returns_empty(self):
        assert extract_memory_updates("") == []

    def test_no_trigger_returns_empty(self):
        assert extract_memory_updates("Logged your expense of Rs. 500.") == []

    def test_save_goal_trigger(self):
        updates = extract_memory_updates("Got it. You want to save Rs. 10,000 this month.")
        assert len(updates) == 1
        assert updates[0].type == "goal"
        assert "save" in updates[0].content.lower()

    def test_planning_to_trigger(self):
        updates = extract_memory_updates("You mentioned planning to buy a bike.")
        assert any("planning to" in u.content.lower() for u in updates)

    def test_trigger_case_insensitive(self):
        updates = extract_memory_updates("Your GOAL IS TO become debt free.")
        assert len(updates) >= 1


class TestDetectIntent:
    # tool-based intent

    def test_create_expense_maps_to_add_expense(self):
        tcs = [{"function": {"name": "create_expense"}}]
        assert detect_intent(tcs, None, "I spent 500") == "add_expense"

    def test_create_income_maps_to_add_income(self):
        tcs = [{"function": {"name": "create_income"}}]
        assert detect_intent(tcs, None, "I got paid") == "add_income"

    def test_update_expense_maps_to_edit_expense(self):
        tcs = [{"function": {"name": "update_expense"}}]
        assert detect_intent(tcs, None, "fix it") == "edit_expense"

    def test_delete_expense_maps(self):
        tcs = [{"function": {"name": "delete_expense"}}]
        assert detect_intent(tcs, None, "remove it") == "delete_expense"

    def test_unknown_tool_falls_back_to_general(self):
        tcs = [{"function": {"name": "something_new"}}]
        assert detect_intent(tcs, None, "") == "general"

    # keyword-based intent (no tools)

    def test_query_spending(self):
        assert detect_intent(None, "", "how much did I spend this week?") == ("query_spending")

    def test_query_balance(self):
        assert detect_intent(None, "", "what's my balance?") == "query_balance"

    def test_query_budget(self):
        assert detect_intent(None, "", "am I over my budget?") == "query_budget"

    def test_get_insight_advice(self):
        assert detect_intent(None, "", "any tips to save more?") == "get_insight"

    def test_default_general(self):
        assert detect_intent(None, "", "hello there") == "general"

    def test_spending_keyword_priority(self):
        """'how much did I spend' contains 'spend' so must map to query_spending."""
        assert detect_intent(None, "", "How much did I spend on food?") == ("query_spending")
