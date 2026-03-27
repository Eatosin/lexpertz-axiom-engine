from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict):
    """
    The Axiom Sovereign State Machine V4.6.
    Synchronized for LangGraph 0.2.x and Command-Aware Auditing.
    """
    # --- Input Context ---
    question: str
    user_id: str
    filenames: List[str]
    
    # --- V4.6 Persistent Memory ---
    # history: Stores last 5 turns: [{"role": "user", "content": "..."}, ...]
    history: List[Dict[str, str]]
    
    # --- V4.6 Command Register ---
    # command: Stores the specific /axm shorthand (e.g., "-a", "-t", "..")
    command: Optional[str]
    
    # --- Working Memory ---
    # comparison_map: Intermediate JSON extraction for multi-doc audits
    comparison_map: Dict[str, Any]
    documents: List[str]
    
    # --- Output State ---
    generation: str
    status: str
    
    # --- Telemetry & Logic Control ---
    hallucination_score: float
    metrics: Dict[str, float]
    retry_count: int
    
    # SSE Observability (Step 0, Step 1, etc.)
    active_node: Optional[str]
