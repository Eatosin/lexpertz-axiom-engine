from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState
from app.core.auth import get_current_user
from typing import Dict, Any, cast

router = APIRouter()

class VerificationRequest(BaseModel):
    question: str

class VerificationResponse(BaseModel):
    answer: str
    status: str
    evidence_count: int

@router.post("/verify", response_model=VerificationResponse)
async def run_verification(
    payload: VerificationRequest,
    user_id: str = Depends(get_current_user)
):
    try:
        initial_state: AgentState = {
            "question": payload.question,
            "user_id": user_id,
            "documents": [],
            "generation": "",
            "hallucination_score": 0.0,
            "metrics": {},
            "status": "thinking"
        }

        # Invoke Graph with Type Cast
        final_state = await app_graph.ainvoke(cast(Any, initial_state))
        
        # SOTA: Robust Response Mapping
        # If the prosecutor blocked the answer, we return the explanation
        answer = final_state.get("generation")
        if not answer or answer == "":
            answer = "Verification Failed: The AI attempted to hallucinate, and the request was terminated for safety."

        return {
            "answer": answer,
            "status": final_state.get("status", "verified"),
            "evidence_count": len(final_state.get("documents", []))
        }

    except Exception as e:
        print(f"❌ GRAPH CRASH: {str(e)}")
        raise HTTPException(status_code=500, detail="Intelligence Core Timeout")
