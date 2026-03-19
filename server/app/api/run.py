import time
import math
import json
import asyncio
from fastapi import APIRouter, HTTPException, Depends, Request
from sse_starlette.sse import EventSourceResponse
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState
from app.core.auth import get_current_user
from app.core.database import db
from typing import Dict, Any, cast, List

router = APIRouter()

# --- 1. SCHEMAS (RESTORED & EXPANDED) ---
class VerificationRequest(BaseModel):
    question: str
    filenames: List[str]

class VerificationResponse(BaseModel):
    """The Schema of Truth for the Final Audit State"""
    answer: str
    status: str
    evidence_count: int
    metrics: Dict[str, float]

def sanitize_float(val: Any) -> float:
    try:
        f_val = float(val)
        return f_val if math.isfinite(f_val) else 0.0
    except (TypeError, ValueError):
        return 0.0

# --- 2. THE STREAMING ENGINE ---
@router.post("/verify")
async def run_verification(
    payload: VerificationRequest,
    user_id: str = Depends(get_current_user)
):
    async def event_generator():
        start_time = time.time()
        initial_state: AgentState = {
            "question": payload.question,
            "user_id": user_id,
            "filenames": payload.filenames,
            "comparison_map": {},
            "documents": [],
            "generation": "",
            "hallucination_score": 0.0,
            "metrics": {},
            "status": "thinking",
            "retry_count": 0
        }

        full_generation = ""
        final_metrics = {}
        
        try:
            # SOTA: v2 astream_events allows us to see inside the brain
            async for event in app_graph.astream_events(initial_state, version="v2"):
                kind = event["event"]
                
                # A. Update UI on which Node is currently thinking
                if kind == "on_node_start":
                    yield {
                        "event": "node_update",
                        "data": json.dumps({"node": event["name"], "status": "active"})
                    }

                # B. Stream Tokens (The Typing Effect)
                # We target the 'simple_llm' or 'writer_llm' inside the nodes
                elif kind == "on_chat_model_stream":
                    content = event["data"].get("chunk", {}).content
                    if content:
                        full_generation += content
                        yield {
                            "event": "token",
                            "data": json.dumps({"text": content})
                        }

                # C. Catch the Final Result & Metrics
                elif kind == "on_chain_end" and event["name"] == "grade_generation_node":
                    # Extract final RAGAS metrics from the node's output
                    output = event["data"].get("output", {})
                    final_metrics = output.get("metrics", {})

            # 3. POST-STREAM PERSISTENCE (Finalizing the Audit)
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
                            "latency": actual_latency
                        }).execute()
                except Exception as log_err:
                    print(f"⚠️ SSE LOG ERROR: {log_err}")

            # D. Final Signal to UI
            yield {
                "event": "audit_complete",
                "data": json.dumps({
                    "answer": full_generation,
                    "metrics": safe_metrics,
                    "latency": actual_latency
                })
            }

        except Exception as e:
            yield {
                "event": "error",
                "data": json.dumps({"detail": str(e)})
            }

    return EventSourceResponse(event_generator())
