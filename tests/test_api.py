import pytest
import json
from unittest.mock import patch
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.auth import get_current_user

# --- AUTH BYPASS FOR TESTING ---
app.dependency_overrides[get_current_user] = lambda: "test-sovereign-user"

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
        # FIX: Structure the chunk as a dict with a 'content' key
        yield {"event": "on_chat_model_stream", "name": "ChatNVIDIA", "data": {"chunk": {"content": "BAD DRAFT TEXT."}}}
        
        # Step 2: Prosecutor grades it 0.0 (Triggering the retry loop)
        yield {"event": "on_chain_start", "name": "grade_generation_node", "data": {}}
        yield {"event": "on_chain_end", "name": "grade_generation_node", "data": {"output": {"metrics": {"faithfulness": 0.0}}}}
        
        # Step 3: Architect runs AGAIN (This is where our fix should trigger 'event: clear')
        yield {"event": "on_chain_start", "name": "generate_node", "data": {}}
        # FIX: Structure the chunk as a dict with a 'content' key
        yield {"event": "on_chat_model_stream", "name": "ChatNVIDIA", "data": {"chunk": {"content": "GOOD DRAFT TEXT."}}}
        yield {"event": "on_chain_end", "name": "generate_node", "data": {"output": {"generation": "GOOD DRAFT TEXT."}}}

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
        
        # A. Prove the clear signal was fired to reset the UI
        assert "event: clear" in text_response, "FATAL: 'clear' event was not emitted during Architect retry!"
        
        # B. Isolate the final audit_complete JSON payload
        final_event_split = text_response.split("event: audit_complete")
        assert len(final_event_split) == 2, "FATAL: audit_complete event missing."
        
        final_data_line = final_event_split[1].strip().replace("data: ", "")
        final_payload = json.loads(final_data_line)
        
        # C. Prove the "Mashed JSON" bug is dead
        final_answer = final_payload.get("answer", "")
        assert "BAD DRAFT TEXT" not in final_answer, "FATAL: State Accumulation Leak! Bad draft leaked into final output."
        assert "GOOD DRAFT TEXT" in final_answer, "FATAL: Good draft missing from final output."
        
        print("\n✅ SSE Retry/Clear Patch Mathematically Verified!")
