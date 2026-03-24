from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    The Axiom Sovereign State Machine.
    Synchronized for LangGraph 0.2.x and Pydantic V2 internal validation.
    """
    # --- Input Context ---
    question: str
    user_id: str
    filenames: List[str]
    
    # --- Working Memory ---
    # comparison_map holds intermediate JSON extraction for multi-doc audits
    comparison_map: Dict[str, Any]
    documents: List[str]
    
    # --- Output State ---
    generation: str
    status: str
    
    # --- Telemetry & Logic Control ---
    hallucination_score: float
    metrics: Dict[str, float]
    retry_count: int
    
    # NEW: Tracking field for SSE Observability (Step 0, Step 1, etc.)
    active_node: Optional[str]
