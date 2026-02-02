from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.graph import app_graph
from typing import Dict, Any

router = APIRouter()

# --- Request Schema ---
class VerificationRequest(BaseModel):
    question: str
    user_id: str  # In production, this comes from the Auth Token, not the body

# --- Response Schema ---
class VerificationResponse(BaseModel):
    answer: str
    status: str
    evidence_count: int

@router.post("/verify", response_model=VerificationResponse)
async def run_verification(payload: VerificationRequest):
    """
    Triggers the Axiom-Verify Agentic Loop.
    """
    try:
        print(f"Starting Logic Loop for: {payload.question}")
        
        # 1. Initialize State
        initial_state = {
            "question": payload.question,
            "documents": [],
            "generation": "",
            "hallucination_score": 0.0,
            "status": "thinking"
        }

        # 2. Invoke the Graph (Blocking execution for MVP)
        # In the future, this will use .stream() for real-time updates
        final_state = await app_graph.ainvoke(initial_state)
        
        # 3. Extract Result
        return {
            "answer": final_state.get("generation", "No answer generated."),
            "status": final_state.get("status", "error"),
            "evidence_count": len(final_state.get("documents", []))
        }

    except Exception as e:
        print(f"Execution Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
