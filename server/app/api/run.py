import time
import math
import json
from fastapi import APIRouter, HTTPException, Depends
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState
from app.core.auth import get_current_user
from app.core.database import db
from typing import Dict, Any, cast, List

router = APIRouter()

# --- 1. SCHEMAS ---
class VerificationRequest(BaseModel):
    question: str
    filenames: List[str]

class VerificationResponse(BaseModel):
    answer: str
    status: str
    evidence_count: int
    metrics: Dict[str, float]

def sanitize_float(val: Any) -> float:
    """Prevents JSON 'NaN' crash by forcing valid floats."""
    try:
        f_val = float(val)
        return f_val if math.isfinite(f_val) else 0.0
    except (TypeError, ValueError):
        return 0.0

# --- 2. STREAMING ENDPOINT ---
@router.post("/verify")
async def run_verification(
    payload: VerificationRequest,
    user_id: str = Depends(get_current_user)
):
    async def event_generator():
        start_time = time.time()
        print(f"--- STREAM STARTED FOR: {payload.question[:30]}... ---")
        
        initial_state: AgentState = {
            "question": payload.question, "user_id": user_id, "filenames": payload.filenames,
            "comparison_map": {}, "documents":[], "generation": "", "hallucination_score": 0.0,
            "metrics": {}, "status": "thinking", "retry_count": 0
        }

        full_generation = ""
        final_metrics = {}
        
        try:
            # v1 astream_events allows us to see inside the brain
            async for event in app_graph.astream_events(initial_state, version="v1"):
                kind = event["event"]
                name = event["name"]
                
                # A. Update UI on which Node is currently thinking
                if kind == "on_chain_start" and name in["Librarian", "Editor", "Strategist", "Architect", "Prosecutor"]:
                    yield {"event": "node_update", "data": json.dumps({"node": name, "status": "active"})}

                # B. Stream Tokens (The Typing Effect)
                elif kind == "on_chat_model_stream":
                    content = event["data"].get("chunk", {}).content
                    if content and isinstance(content, str):
                        full_generation += content
                        yield {"event": "token", "data": json.dumps({"text": content})}

                # C. Catch the Final Result & Metrics
                elif kind == "on_chain_end" and name in ["grade_generation_node", "Prosecutor"]:
                    output = event["data"].get("output", {})
                    final_metrics = output.get("metrics", {})

            # --- RESTORED FALLBACK LOGIC ---
            if not full_generation or full_generation.strip() == "":
                full_generation = "Verification Failed: The AI attempted to hallucinate, and the request was terminated for safety."
                yield {"event": "token", "data": json.dumps({"text": full_generation})}

            # --- POST-STREAM PERSISTENCE ---
            actual_latency = round(time.time() - start_time, 2)
            safe_metrics = {k: sanitize_float(v) for k, v in final_metrics.items()}

            if db:
                try:
                    primary_file = payload.filenames[0] if payload.filenames else "vault"
                    doc_res = db.table("documents").select("id").eq("filename", primary_file).eq("user_id", user_id).execute()
                    doc_data = cast(List[Dict[str, Any]], doc_res.data)
                    
                    if doc_data:
                        doc_id = doc_data[0]['id']
                        # Save History
                        db.table("chat_messages").insert({"document_id": doc_id, "user_id": user_id, "role": "user", "content": payload.question}).execute()
                        db.table("chat_messages").insert({"document_id": doc_id, "user_id": user_id, "role": "assistant", "content": full_generation, "metrics": safe_metrics}).execute()
                        # Save Telemetry
                        db.table("audit_logs").insert({
                            "user_id": user_id, "question": payload.question, 
                            "faithfulness": safe_metrics.get("faithfulness", 0.0),
                            "precision": safe_metrics.get("precision", 0.0),
                            "relevance": safe_metrics.get("relevance", 0.0),
                            "latency": actual_latency
                        }).execute()
                except Exception as log_err:
                    print(f"⚠️ SSE DB ERROR: {log_err}")

            # D. Final Signal to UI
            print("--- STREAM COMPLETE ---")
            yield {
                "event": "audit_complete",
                "data": json.dumps({"answer": full_generation, "metrics": safe_metrics})
            }

        except Exception as e:
            print(f"❌ STREAM CRASH: {str(e)}")
            yield {"event": "error", "data": json.dumps({"detail": str(e)})}

    return EventSourceResponse(event_generator())
