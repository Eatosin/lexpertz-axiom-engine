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
from typing import Dict, Any, cast, List, AsyncGenerator

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
    async def event_generator() -> AsyncGenerator[Dict[str, Any], None]:
        try:
            start_time = time.time()
            print(f"--- STREAM STARTED FOR: {payload.question[:30]}... ---")

            history_buffer: List[Dict[str, str]] = []
            is_root_reset = payload.question.strip().startswith("/axm ..")

            if db and not is_root_reset:
                try:
                    primary_file = payload.filenames[0] if payload.filenames else "vault"
                    doc_res = db.table("documents").select("id").eq("filename", primary_file).eq("user_id", user_id).execute()
                    
                    # FIX: Explicit cast to allow indexing
                    doc_rows = cast(List[Dict[str, Any]], doc_res.data)
                    if doc_rows:
                        doc_id = doc_rows[0]['id']
                        hist_res = db.table("chat_messages").select("role, content").eq("document_id", doc_id).eq("user_id", user_id).order("created_at", desc=True).limit(5).execute()
                        
                        # FIX: Cast to match AgentState history requirements
                        raw_hist = cast(List[Dict[str, str]], hist_res.data)
                        history_buffer = raw_hist[::-1]
                except Exception as e:
                    print(f"AXM-MEM: History hydration failed: {e}")

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
            final_metrics: Dict[str, float] = {}
            current_active_node = "System"
            
            ui_node_map = {
                "retrieve_node": "Librarian", "Librarian": "Librarian",
                "distill_node": "Editor", "Editor": "Editor",
                "strategist_node": "Strategist", "Strategist": "Strategist",
                "generate_node": "Architect", "Architect": "Architect",
                "grade_generation_node": "Prosecutor", "Prosecutor": "Prosecutor"
            }

            async for event in app_graph.astream_events(initial_state, version="v1"):
                kind = event["event"]
                name = event["name"]
                
                if kind == "on_chain_start" and name in ui_node_map:
                    current_active_node = ui_node_map[name]
                    yield {"event": "node_update", "data": json.dumps({"node": current_active_node, "status": "active"})}

                elif kind == "on_chat_model_stream":
                    if current_active_node in ["Architect", "Strategist"]:
                        chunk = event["data"].get("chunk")
                        content = ""
                        if chunk:
                            if hasattr(chunk, "content"): content = str(chunk.content)
                            elif isinstance(chunk, dict) and "content" in chunk: content = str(chunk["content"])
                                
                        if content:
                            full_generation += content
                            yield {"event": "token", "data": json.dumps({"text": content})}

                elif kind == "on_chain_end" and name in ["generate_node", "Architect"]:
                    # FIX: Explicit type annotation for Mypy
                    node_output: Dict[str, Any] = event["data"].get("output", {})
                    if not full_generation and "generation" in node_output:
                        full_generation = str(node_output["generation"])
                        yield {"event": "token", "data": json.dumps({"text": full_generation})}

                elif kind == "on_chain_end" and name in ["grade_generation_node", "Prosecutor"]:
                    # FIX: Explicit type annotation for Mypy
                    eval_output: Dict[str, Any] = event["data"].get("output", {})
                    final_metrics = eval_output.get("metrics", {})

            if not full_generation.strip():
                full_generation = "Verification Failed: Audit logic rejected the draft."
                yield {"event": "token", "data": json.dumps({"text": full_generation})}

            actual_latency = round(time.time() - start_time, 2)
            safe_metrics = {k: sanitize_float(v) for k, v in final_metrics.items()}

            if db:
                try:
                    primary_file = payload.filenames[0] if payload.filenames else "vault"
                    doc_res = db.table("documents").select("id").eq("filename", primary_file).eq("user_id", user_id).execute()
                    doc_data = cast(List[Dict[str, Any]], doc_res.data)
                    
                    if doc_data:
                        doc_id = doc_data[0]['id']
                        db.table("chat_messages").insert({"document_id": doc_id, "user_id": user_id, "role": "user", "content": payload.question}).execute()
                        db.table("chat_messages").insert({"document_id": doc_id, "user_id": user_id, "role": "assistant", "content": full_generation, "metrics": safe_metrics}).execute()
                        db.table("audit_logs").insert({"user_id": user_id, "question": payload.question, "faithfulness": safe_metrics.get("faithfulness", 0.0), "latency": actual_latency}).execute()
                except Exception as log_err:
                    print(f"SSE DB ERROR: {log_err}")

            yield {
                "event": "audit_complete",
                "data": json.dumps({"answer": full_generation, "metrics": safe_metrics})
            }

        except Exception as e:
            error_msg = str(e)
            print(f"❌ MASTER STREAM CRASH: {error_msg}")
            yield {"event": "error", "data": json.dumps({"detail": f"Backend Engine Disconnected: {error_msg}"})}

    return EventSourceResponse(event_generator())
