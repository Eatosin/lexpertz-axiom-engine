import time
import math
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState
from app.core.auth import get_current_user
from app.core.database import db
from typing import Dict, Any, cast, List

router = APIRouter()

class VerificationRequest(BaseModel):
    question: str
    filenames: List[str] # Correctly typed as a list for V3.1

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

@router.post("/verify", response_model=VerificationResponse)
async def run_verification(
    payload: VerificationRequest,
    user_id: str = Depends(get_current_user)
):
    start_time = time.time()

    try:
        # 1. Initialize State with Bulk Capability
        initial_state: AgentState = {
            "question": payload.question,
            "user_id": user_id,
            "filenames": payload.filenames,
            "comparison_map": {},
            "documents":[],
            "generation": "",
            "hallucination_score": 0.0,
            "metrics": {},
            "status": "thinking",
            "retry_count": 0
        }

        # 2. Invoke Graph (app_graph now handles List[str] in logic)
        final_state = await app_graph.ainvoke(cast(Any, initial_state))
        
        # CALCULATE REAL LATENCY
        actual_latency = round(time.time() - start_time, 2)
        
        raw_metrics = final_state.get("metrics", {})
        # SANITIZE METRICS: Prevents JSON 'NaN' crash (Error 500)
        safe_metrics = {k: sanitize_float(v) for k, v in raw_metrics.items()}
        
        answer = final_state.get("generation")
        
        if not answer or answer == "":
            answer = "Verification Failed: The AI attempted to hallucinate, and the request was terminated for safety."

        # 3. V2.9 PERSISTENCE LAYER & TELEMETRY
        if db:
            try:
                # A. Find the Document ID
                primary_file = payload.filenames[0] if payload.filenames else "vault"
                
                doc_res = db.table("documents").select("id").eq("filename", primary_file).eq("user_id", user_id).execute()
                doc_data = cast(List[Dict[str, Any]], doc_res.data)
                
                if doc_data:
                    doc_id = doc_data[0]['id']

                    # B. Save User Query
                    db.table("chat_messages").insert({
                        "document_id": doc_id,
                        "user_id": user_id,
                        "role": "user",
                        "content": payload.question
                    }).execute()

                    # C. Save AI Response (With safe RAGAS Metrics!)
                    db.table("chat_messages").insert({
                        "document_id": doc_id,
                        "user_id": user_id,
                        "role": "assistant",
                        "content": answer,
                        "metrics": safe_metrics 
                    }).execute()

                # D. Log to global audit_logs 
                db.table("audit_logs").insert({
                    "user_id": user_id,
                    "question": payload.question,
                    "faithfulness": safe_metrics.get("faithfulness", 0.0),
                    "precision": safe_metrics.get("precision", 0.0),
                    "relevance": safe_metrics.get("relevance", 0.0),
                    "latency": actual_latency 
                }).execute()

            except Exception as log_e:
                print(f"⚠️ Memory Bank Error: {log_e}") # Non-fatal

        # 4. Return Response
        return {
            "answer": answer,
            "status": final_state.get("status", "verified"),
            "evidence_count": len(final_state.get("documents",[])),
            "metrics": metrics
        }

    except Exception as e:
        print(f"❌ GRAPH CRASH: {str(e)}")
        raise HTTPException(status_code=500, detail="Intelligence Core Timeout")
