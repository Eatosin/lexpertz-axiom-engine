import pytest
import json
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.auth import get_current_user

# --- AUTH BYPASS FOR TESTING (unchanged) ---
app.dependency_overrides[get_current_user] = lambda: "test-sovereign-user"


# ---------------------------------------------------------
# SSE RETRY / CLEAR SIGNAL TESTS (Stable Single Test)
# ---------------------------------------------------------
@pytest.mark.asyncio
@patch("app.api.run.app_graph.astream_events")
async def test_sse_retry_clear_signal(mock_astream_events):
    """
    SOTA API INTEGRATION TEST: Proves retry + clear signal works end-to-end.
    """
    async def mock_generator(*args, **kwargs):
        # 🚨 FIX 1: We yield proper LangGraph objects, complete with "name" and "data" keys
        
        # Architect first run (bad draft)
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        yield {"event": "on_chat_model_stream", "name": "generate_node", "data": {"chunk": {"content": "BAD DRAFT TEXT."}}}
        yield {"event": "on_chain_end", "name": "generate_node", "data": {"output": {"generation": "BAD DRAFT TEXT."}}}
        
        # Prosecutor grades low → triggers retry
        yield {"event": "on_chain_start", "name": "grade_generation_node", "data": {}}
        yield {"event": "on_chain_end", "name": "grade_generation_node", "data": {"output": {"metrics": {"faithfulness": 0.0}}}}
        
        # Architect retry (good draft) -> run.py detects 'generate_node' + existing text and triggers CLEAR
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        yield {"event": "on_chat_model_stream", "name": "generate_node", "data": {"chunk": {"content": "GOOD DRAFT TEXT."}}}
        yield {"event": "on_chain_end", "name": "generate_node", "data": {"output": {"generation": "GOOD DRAFT TEXT."}}}

    mock_astream_events.side_effect = mock_generator

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/verify",
            json={"question": "Test the retry logic", "filenames":["dummy.pdf"]}
        )

        assert response.status_code == 200
        text_response = response.text

        print("\n--- RAW SSE STREAM ---")
        print(text_response)
        print("----------------------")

        assert "event: clear" in text_response, "FATAL: 'clear' event was not emitted during Architect retry!"
        assert "event: audit_complete" in text_response, "FATAL: audit_complete event missing."
        
        final_event_split = text_response.split("event: audit_complete")
        assert len(final_event_split) == 2, "FATAL: Malformed audit_complete event."
        
        final_data_line = final_event_split[1].strip().replace("data: ", "").strip()
        final_payload = json.loads(final_data_line)
        
        final_answer = final_payload.get("answer", "")
        assert "BAD DRAFT TEXT" not in final_answer, "FATAL: Bad draft leaked into final output."
        assert "GOOD DRAFT TEXT" in final_answer, "FATAL: Good draft missing from final output."
        
        print("\n✅ SSE Retry/Clear Patch Mathematically Verified!")
        
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
    # FIX 2: Added *args, **kwargs so it can accept version="v1" from run.py
    async def error_generator(*args, **kwargs):
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        yield {"event": "on_chat_model_stream", "name": "generate_node", "data": {"chunk": {"content": "PARTIAL DRAFT"}}}
        raise Exception("Simulated stream failure")

    mock_astream_events.side_effect = error_generator

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        response = await ac.post(
            "/api/v1/verify",
            json={"question": "Test stream error resilience", "filenames":["dummy.pdf"]}
        )

        assert response.status_code in (200, 500), "SSE endpoint should not crash the server"
        assert "event: error" in response.text, "SSE stream should emit error event to UI"
        assert "Simulated stream failure" in response.text, "Exception message didn't reach UI"
        print("\n✅ SSE Stream Error Resilience Verified")
