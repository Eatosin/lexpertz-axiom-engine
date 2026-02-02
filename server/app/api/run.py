from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState
from typing import Dict, Any, cast # <--- 1. Import cast

router = APIRouter()

# --- Request Schema ---
class VerificationRequest(BaseModel):
    question: str
    user_id: str 

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
        
        # 2. Define State
        initial_state: AgentState = {
            "question": payload.question,
            "documents": [],
            "generation": "",
            "hallucination_score": 0.0,
            "status": "thinking"
        }

        # 3. Invoke the Graph (FIXED)
        # We cast to Any to bypass MyPy's strict check on LangGraph's internal generics
        final_state = await app_graph.ainvoke(cast(Any, initial_state))
        
        # 4. Extract Result
        return {
            "answer": final_state.get("generation", "No answer generated."),
            "status": final_state.get("status", "error"),
            "evidence_count": len(final_state.get("documents", []))
        }

    except Exception as e:
        print(f"Execution Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
