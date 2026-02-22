from typing import TypedDict, List, Dict

class AgentState(TypedDict):
    """
    The Brain's Working Memory.
    Now includes Identity Context for RLS enforcement,
    and RAGAS Telemetry for mathematical auditing.
    """
    question: str
    user_id: str
    documents: List[str]
    generation: str
    hallucination_score: float
    metrics: Dict[str, float]
    status: str
