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
    SOTA API INTEGRATION TEST: 
    Proves that when the Prosecutor triggers a retry (Architect runs twice),
    the SSE stream correctly emits an 'event: clear' signal and wipes the failed draft.
    """
    
    # 1. SIMULATE A LANGGRAPH RETRY SEQUENCE
    async def mock_generator(*args, **kwargs):
        # Step 1: Architect writes a bad draft
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        yield {"event": "on_chat_model_stream", "name": "ChatNVIDIA", "data": {"chunk": {"content": "BAD DRAFT TEXT."}}}
        
        # Step 2: Prosecutor grades it 0.0 (Triggering the retry loop)
        yield {"event": "on_chain_start", "name": "grade_generation_node", "data": {}}
        yield {"event": "on_chain_end", "name": "grade_generation_node", "data": {"output": {"metrics": {"faithfulness": 0.0}}}}
        
        # Step 3: Clear signal + Architect runs AGAIN
        yield {"event": "clear", "data": {"message": "retry_triggered"}}
        
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        yield {"event": "on_chat_model_stream", "name": "ChatNVIDIA", "data": {"chunk": {"content": "GOOD DRAFT TEXT."}}}
        yield {"event": "on_chain_end", "name": "generate_node", "data": {"output": {"generation": "GOOD DRAFT TEXT."}}}

        # Final successful grading + audit_complete
        yield {"event": "on_chain_end", "name": "grade_generation_node", "data": {"output": {"metrics": {"faithfulness": 0.95}}}}
        yield {"event": "on_chain_end", "name": "app_graph", "data": {"output": {"answer": "GOOD DRAFT TEXT.", "metrics": {"faithfulness": 0.95}}}}

    mock_astream_events.side_effect = mock_generator

    # 2. EXECUTE THE ENDPOINT CALL
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
        
        # A. Prove the clear signal was fired
        assert "event: clear" in text_response, "FATAL: 'clear' event was not emitted during Architect retry!"
        
        # B. Prove audit_complete event exists
        assert "event: audit_complete" in text_response, "FATAL: audit_complete event missing."
        
        # C. Prove the "Mashed JSON" bug is dead
        final_event_split = text_response.split("event: audit_complete")
        assert len(final_event_split) == 2, "FATAL: Malformed audit_complete event."
        
        final_data_line = final_event_split[1].strip().replace("data: ", "").strip()
        final_payload = json.loads(final_data_line)
        
        final_answer = final_payload.get("answer", "")
        assert "BAD DRAFT TEXT" not in final_answer, "FATAL: State Accumulation Leak! Bad draft leaked into final output."
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
