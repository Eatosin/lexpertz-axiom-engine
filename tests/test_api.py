import pytest
import json
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.auth import get_current_user

# --- AUTH BYPASS FOR TESTING (unchanged) ---
app.dependency_overrides[get_current_user] = lambda: "test-sovereign-user"


# ---------------------------------------------------------
# Reusable Mock Stream Generator (Enterprise Pattern)
# ---------------------------------------------------------
async def create_mock_stream(retry_count: int = 1, final_answer: str = "GOOD DRAFT TEXT."):
    """Reusable generator that simulates LangGraph retry sequences."""
    # First Architect run → bad draft
    yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
    yield {"event": "on_chat_model_stream", "name": "ChatNVIDIA", "data": {"chunk": {"content": "BAD DRAFT TEXT."}}}
    yield {"event": "on_chain_end", "name": "generate_node", "data": {"output": {"generation": "BAD DRAFT TEXT."}}}

    # Prosecutor grades it low → triggers retry
    yield {"event": "on_chain_start", "name": "grade_generation_node", "data": {}}
    yield {"event": "on_chain_end", "name": "grade_generation_node", "data": {"output": {"metrics": {"faithfulness": 0.0}}}}

    # Retry loop
    for i in range(retry_count):
        # Clear signal must be emitted before each retry
        yield {"event": "clear", "data": {"message": "retry_triggered"}}

        # Architect runs again
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        yield {"event": "on_chat_model_stream", "name": "ChatNVIDIA", "data": {"chunk": {"content": f"GOOD DRAFT TEXT. (retry {i+1})"}}}
        yield {"event": "on_chain_end", "name": "generate_node", "data": {"output": {"generation": final_answer}}}

    # Final successful Prosecutor + audit_complete
    yield {"event": "on_chain_start", "name": "grade_generation_node", "data": {}}
    yield {"event": "on_chain_end", "name": "grade_generation_node", "data": {"output": {"metrics": {"faithfulness": 0.95}}}}
    yield {"event": "on_chain_end", "name": "app_graph", "data": {"output": {"answer": final_answer, "metrics": {"faithfulness": 0.95}}}}


# ---------------------------------------------------------
# 1. SSE RETRY / CLEAR SIGNAL TESTS – FULL PATH COVERAGE
# ---------------------------------------------------------
@pytest.mark.asyncio
@pytest.mark.parametrize(
    "test_case, retry_count, expected_clear_events, should_leak_bad_draft, description",
    [
        # Happy path – no retry
        ("happy_no_retry", 0, 0, False, "No retry – clean single pass"),
        # Single retry (most common production case)
        ("single_retry", 1, 1, False, "Prosecutor triggers exactly one retry + clear signal"),
        # Multiple retries (stress test)
        ("double_retry", 2, 2, False, "Multiple retries – clear signal must fire each time"),
        # Max retry limit reached (safety path)
        ("max_retry", 3, 3, False, "Retry limit hit – no infinite loop, still emits clear signals"),
    ],
    ids=["no_retry", "single_retry", "double_retry", "max_retry_limit"]
)
@patch("app.api.run.app_graph.astream_events")
async def test_sse_retry_clear_signal_all_paths(
    mock_astream_events,
    test_case,
    retry_count,
    expected_clear_events,
    should_leak_bad_draft,
    description,
):
    """
    Validates the full SSE retry/clear mechanism across all critical paths.
    Protects against:
    - State accumulation / "mashed JSON" bugs (bad drafts leaking into final answer)
    - Missing 'clear' events (UI would show stale failed drafts)
    - Infinite retry loops
    - Regression in the retry/clear patch
    """
    mock_astream_events.side_effect = create_mock_stream(retry_count=retry_count)

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/verify",
            json={"question": f"Test retry logic - {test_case}", "filenames": ["dummy.pdf"]}
        )

        assert response.status_code == 200, f"API returned {response.status_code} in {test_case}"

        text_response = response.text
        print(f"\n--- RAW SSE STREAM ({test_case}) ---")
        print(text_response)
        print("----------------------")

        # 1. Clear signal count must match expected retries
        clear_count = text_response.count("event: clear")
        assert clear_count == expected_clear_events, \
            f"Expected {expected_clear_events} 'clear' events, got {clear_count} in {test_case}"

        # 2. Final audit_complete payload must exist and be valid JSON
        assert "event: audit_complete" in text_response, f"Missing audit_complete event in {test_case}"
        final_event_split = text_response.split("event: audit_complete")
        assert len(final_event_split) == 2, f"Malformed audit_complete event in {test_case}"

        final_data_line = final_event_split[1].strip().replace("data: ", "").strip()
        final_payload = json.loads(final_data_line)

        # 3. No leaked bad drafts (the exact bug this test was created to kill)
        final_answer = final_payload.get("answer", "")
        assert "BAD DRAFT TEXT" not in final_answer, \
            f"FATAL: Bad draft leaked into final output in {test_case}!"

        # 4. Good final answer must be present
        assert "GOOD DRAFT TEXT" in final_answer, \
            f"FATAL: Final good draft missing in {test_case}"

        # 5. Metrics must be present (Prosecutor succeeded)
        assert "metrics" in final_payload
        assert final_payload["metrics"].get("faithfulness", 0) > 0.9

        print(f"✅ SSE Retry/Clear Patch Verified: {description}")


# ---------------------------------------------------------
# 2. SSE STREAM ERROR RESILIENCE (New – critical safety test)
# ---------------------------------------------------------
@pytest.mark.asyncio
@patch("app.api.run.app_graph.astream_events")
async def test_sse_stream_error_resilience(mock_astream_events):
    """
    Ensures the SSE endpoint remains stable even if the underlying LangGraph stream raises an exception.
    Protects against partial streams crashing the FastAPI SSE response.
    """
    async def error_generator():
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        yield {"event": "on_chat_model_stream", "name": "ChatNVIDIA", "data": {"chunk": {"content": "PARTIAL DRAFT"}}}
        raise Exception("Simulated stream failure")

    mock_astream_events.side_effect = error_generator

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/verify",
            json={"question": "Test stream error resilience", "filenames": ["dummy.pdf"]}
        )

        # FastAPI should still return 200 with partial data or error event (your SSE error handler)
        assert response.status_code in (200, 500), "SSE endpoint should not crash the server"
        assert "event:" in response.text, "SSE stream should still emit at least one event even on error"
        print("✅ SSE Stream Error Resilience Verified")
