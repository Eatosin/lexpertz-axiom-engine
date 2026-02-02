from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.agents.graph import app_graph
from app.agents.state import AgentState # <--- 1. Import the Type
from typing import Dict, Any

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
        
        # 2. Explicitly Type the State using AgentState
        initial_state: AgentState = {
            "question": payload.question,
            "documents": [],
            "generation": "",
            "hallucination_score": 0.0,
            "status": "thinking"
        }

        # 3. Invoke the Graph (Now MyPy knows this is a valid AgentState)
        final_state = await app_graph.ainvoke(initial_state)
        
        # 4. Extract Result
        # Note: We use .get() because TypedDicts behave like dicts at runtime
        return {
            "answer": final_state.get("generation", "No answer generated."),
            "status": final_state.get("status", "error"),
            "evidence_count": len(final_state.get("documents", []))
        }

    except Exception as e:
        print(f"Execution Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
