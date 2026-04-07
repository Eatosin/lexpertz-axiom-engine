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
        # THE MASTER SHIELD: Wraps the entire generator execution
        try:
            start_time = time.time()
            print(f"--- STREAM STARTED FOR: {payload.question[:30]}... ---")

            # --- V4.6 MEMORY RETRIEVAL (The Memory Bank) ---
            history_buffer =[]
            is_root_reset = payload.question.strip().startswith("/axm ..")

            if db and not is_root_reset:
                try:
                    # 1. Anchor history to the primary document context
                    primary_file = payload.filenames[0] if payload.filenames else "vault"
                    doc_res = db.table("documents").select("id").eq("filename", primary_file).eq("user_id", user_id).execute()
                    
                    if doc_res.data:
                        doc_id = doc_res.data[0]['id']
                        # 2. Fetch last 5 turns for follow-up context
                        hist_res = db.table("chat_messages").select("role, content").eq("document_id", doc_id).eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
                        # 3. Reverse to chronological order [Oldest -> Newest]
                        history_buffer = hist_res.data[::-1]
                        if history_buffer:
                            print(f"AXM-MEM: Hydrated {len(history_buffer)} turns of history context.")
                except Exception as e:
                    print(f"AXM-MEM: History hydration failed (Non-fatal): {e}")

            # --- INITIALIZE STATE (V4.6 Compliant) ---
            initial_state: AgentState = {
                "question": payload.question, 
                "user_id": user_id, 
                "filenames": payload.filenames,
                "history": history_buffer,   
                "command": None,             
                "comparison_map": {}, 
                "documents":[], 
                "generation": "", 
                "hallucination_score": 0.0,
                "metrics": {}, 
                "status": "thinking", 
                "retry_count": 0,
                "active_node": None
            }

            full_generation = ""
            final_metrics = {}
            
            # --- THE LANGGRAPH STREAM ---
            async for event in app_graph.astream_events(initial_state, version="v1"):
                kind = event["event"]
                name = event["name"]
                
                # A. Node Status Updates
                if kind == "on_chain_start" and name in["Librarian", "Editor", "Strategist", "Architect", "Prosecutor"]:
                    yield {"event": "node_update", "data": json.dumps({"node": name, "status": "active"})}

                # B. SOTA Token Streaming (Hardened chunk extraction)
                elif kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    content = ""
                    if chunk:
                        if hasattr(chunk, "content"):
                            content = chunk.content
                        elif isinstance(chunk, dict) and "content" in chunk:
                            content = chunk["content"]
                        elif isinstance(chunk, str):
                            content = chunk
                            
                    if content and isinstance(content, str):
                        full_generation += content
                        yield {"event": "token", "data": json.dumps({"text": content})}

                # C. Catch Metrics
                elif kind == "on_chain_end" and name in["grade_generation_node", "Prosecutor"]:
                    output = event["data"].get("output", {})
                    final_metrics = output.get("metrics", {})

            # D. Fallback Logic
            if not full_generation or full_generation.strip() == "":
                full_generation = "Verification Failed: Audit logic rejected the draft or context was insufficient."
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
                        # 1. Save User Question
                        db.table("chat_messages").insert({
                            "document_id": doc_id, "user_id": user_id, "role": "user", "content": payload.question
                        }).execute()
                        # 2. Save Assistant Response
                        db.table("chat_messages").insert({
                            "document_id": doc_id, "user_id": user_id, "role": "assistant", "content": full_generation, "metrics": safe_metrics
                        }).execute()
                        # 3. Save Global Audit Log
                        db.table("audit_logs").insert({
                            "user_id": user_id, "question": payload.question, 
                            "faithfulness": safe_metrics.get("faithfulness", 0.0),
                            "latency": actual_latency
                        }).execute()
                except Exception as log_err:
                    print(f"SSE DB ERROR: {log_err}")

            # E. Final Signal to UI
            print("--- STREAM COMPLETE ---")
            yield {
                "event": "audit_complete",
                "data": json.dumps({"answer": full_generation, "metrics": safe_metrics})
            }

        except Exception as e:
            # THIS PREVENTS UI FREEZES: Sends the exact error message directly to the Chat UI
            error_msg = str(e)
            print(f"MASTER STREAM CRASH: {error_msg}")
            yield {"event": "error", "data": json.dumps({"detail": f"Backend Engine Disconnected: {error_msg}"})}

    return EventSourceResponse(event_generator())
