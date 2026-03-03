from typing import TypedDict, List, Dict, Any

class AgentState(TypedDict):
    """
    The Brain's Working Memory.
    Upgraded for Multi-Document Map-Reduce Auditing.
    """
    question: str
    user_id: str
    filenames: List[str]
    comparison_map: Dict[str, Any]
    documents: List[str]
    generation: str
    hallucination_score: float
    metrics: Dict[str, float]
    status: str
