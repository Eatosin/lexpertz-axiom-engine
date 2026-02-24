from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState
from app.core.auth import get_current_user
from app.core.database import db
from typing import Dict, Any, cast

router = APIRouter()

class VerificationRequest(BaseModel):
    question: str
    filename: str

class VerificationResponse(BaseModel):
    answer: str
    status: str
    evidence_count: int
    metrics: Dict[str, float] # NEW: Ensure Pydantic accepts the dictionary

@router.post("/verify", response_model=VerificationResponse)
async def run_verification(
    payload: VerificationRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        # 1. Initialize State with the new empty metrics dictionary
        initial_state: AgentState = {
            "question": payload.question,
            "user_id": user_id,
            "filename": payload.filename,
            "documents": [],
            "generation": "",
            "hallucination_score": 0.0,
            "metrics": {},
            "status": "thinking"
        }

        # 2. Invoke Graph
        final_state = await app_graph.ainvoke(cast(Any, initial_state))
        
        metrics = final_state.get("metrics", {})
        
        # Fire-and-forget logging to Supabase
        if db and metrics:
            try:
                db.table("audit_logs").insert({
                    "user_id": user_id,
                    "question": payload.question,
                    "faithfulness": metrics.get("faithfulness", 0),
                    "precision": metrics.get("precision", 0),
                    "relevance": metrics.get("relevance", 0)
                }).execute()
            except Exception as log_e:
                print(f"Failed to log audit: {log_e}") # Non-fatal
        
        # 3. Robust Response Mapping
        answer = final_state.get("generation")
        if not answer or answer == "":
            answer = "Verification Failed: The AI attempted to hallucinate, and the request was terminated for safety."

        # 4. Return the new payload including RAGAS metrics
        return {
            "answer": answer,
            "status": final_state.get("status", "verified"),
            "evidence_count": len(final_state.get("documents", [])),
            "metrics": final_state.get("metrics", {}) # NEW: Pass the RAGAS math to the client
        }

    except Exception as e:
        print(f"❌ GRAPH CRASH: {str(e)}")
        raise HTTPException(status_code=500, detail="Intelligence Core Timeout")
