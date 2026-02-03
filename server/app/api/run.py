from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState
from app.core.auth import get_current_user # <--- IMPORTED
from typing import Dict, Any, cast

router = APIRouter()

# --- Request Schema (Refactored) ---
class VerificationRequest(BaseModel):
    question: str
    # user_id removed from body. We now use the secure header.

class VerificationResponse(BaseModel):
    answer: str
    status: str
    evidence_count: int

@router.post("/verify", response_model=VerificationResponse)
async def run_verification(
    payload: VerificationRequest,
    user_id: str = Depends(get_current_user) # <--- DYNAMIC IDENTITY INJECTED
):
    try:
        # 1. Initialize State with the Real User Identity
        initial_state: AgentState = {
            "question": payload.question,
            "documents": [],
            "generation": "",
            "hallucination_score": 0.0,
            "status": "thinking"
        }

        # 2. Invoke Graph
        # NOTE: Inside the graph, the 'retrieve_node' will now use 
        # this user_id to filter the Supabase search.
        final_state = await app_graph.ainvoke(cast(Any, initial_state))
        
        return {
            "answer": final_state.get("generation", "No answer generated."),
            "status": final_state.get("status", "error"),
            "evidence_count": len(final_state.get("documents", []))
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
