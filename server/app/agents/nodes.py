import os
import time
from typing import cast, List, Dict, Any

from langchain_core.pydantic_v1 import SecretStr, BaseModel, Field
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import Tool
from langchain_experimental.utilities import PythonREPL

# Internal Logic Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import get_reranked_scores 
from app.core.monitor import monitor
from app.prompts.templates import VERIFICATION_PROMPT, DISTILLATION_PROMPT
from app.core.evaluator import axiom_evaluator

# --- 1. TOOL ARCHITECTURE ---
python_repl = PythonREPL()
repl_tool = Tool(
    name="python_repl",
    description="A Python shell. Use this to execute math calculations.",
    func=python_repl.run,
)

# --- 2. BRAIN CONFIGURATION ---
_env_key = os.getenv("GROQ_API_KEY")
secret_key = SecretStr(_env_key) if _env_key else None

base_llm = ChatGroq(temperature=0, model="llama-3.3-70b-versatile", api_key=secret_key)
writer_llm = base_llm.bind_tools([repl_tool])
grader_llm = ChatGroq(temperature=0, model="llama-3.1-8b-instant", api_key=secret_key)

# --- 3. STRUCTURED OUTPUT MODELS ---
class DistilledContext(BaseModel):
    has_relevant_evidence: bool = Field(description="True if snippets contain facts relevant to the query.")
    brief: str = Field(description="The synthesized evidence brief.")

class HallucinationGrade(BaseModel):
    is_hallucinating: str = Field(description="Must be 'true' or 'false'.")
    explanation: str = Field(description="Detailed logic behind the grade")

editor_llm = grader_llm.with_structured_output(DistilledContext)
prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    """
    Station 1: Evidence Retrieval. 
    Strictly typed to satisfy Mypy.
    """
    filenames = state.get("filenames", [])
    is_vault_mode = "vault" in filenames or len(filenames) == 0
    
    search_input = None if is_vault_mode else filenames
    
    print(f"--- AXIOM: RETRIEVING FROM {', '.join(filenames) if search_input else 'GLOBAL VAULT'} ---")
    
    search_limit = 40 if is_vault_mode or len(filenames) > 1 else 20

    initial_chunks = await hybrid_search(
        query=state["question"], 
        user_id=state["user_id"], 
        filename=search_input,
        limit=search_limit
    )
    
    if not initial_chunks:
        return {"documents": [], "generation": "Insufficient Evidence.", "status": "no_evidence"}

    top_k = 12 if len(filenames) > 1 else 5
    gold_chunks = get_reranked_scores(query=state["question"], documents=initial_chunks, top_k=top_k)

    return {"documents": gold_chunks, "status": "thinking"}

async def distill_node(state: AgentState):
    """Station 1.5: Context Editor (Single-Doc path)"""
    context_text = monitor.guard_context(state["documents"])
    if not context_text.strip(): return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    chain = DISTILLATION_PROMPT | editor_llm
    raw_response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    response = cast(DistilledContext, raw_response)
    return {"generation": response.brief if response.has_relevant_evidence else "NO RELEVANT EVIDENCE", "status": "thinking"}

async def strategist_node(state: AgentState):
    """Station 1.6: The Strategist (Multi-Doc path / Reduce phase)"""
    print("--- AXIOM: STRATEGIST NODE (COMPARING DOCUMENTS) ---")
    context_text = monitor.guard_context(state["documents"])
    
    prompt = ChatPromptTemplate.from_template("""
    You are the Axiom Strategist. Perform a Comparative Audit.
    Identify contradictions, risk deltas, and regulatory loopholes between the provided source exhibits.
    
    Context: {context}
    Query: {question}
    """)
    
    chain = prompt | writer_llm
    response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    return {"generation": str(response.content), "status": "thinking"}

async def generate_node(state: AgentState):
    """Station 2: Final Reasoning (70B)"""
    distilled_brief = state["generation"]
    if distilled_brief == "NO RELEVANT EVIDENCE":
        return {"generation": "No direct evidence found.", "status": "verifying"}

    chain = VERIFICATION_PROMPT | writer_llm
    response = await chain.ainvoke({"context": distilled_brief, "question": state["question"]})
    return {"generation": str(response.content), "status": "verifying"}

async def grade_generation_node(state: AgentState):
    """Station 3: Adversarial Audit with Retry Logic"""
    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    
    raw_grade = prosecutor_llm.invoke(f"FACT CHECK:\nCONTEXT: {context_str}\nDRAFT: {state['generation']}")
    grade = cast(HallucinationGrade, raw_grade)

    if str(grade.is_hallucinating).strip().lower() == "true":
        print(f"❌ LOGIC BREACH: {grade.explanation}")
        return {
            "hallucination_score": 0.0, 
            "status": "thinking",
            "retry_count": state.get("retry_count", 0) + 1
        }

    scores = await axiom_evaluator.score_response(state["question"], state["generation"], context_list)
    return {"hallucination_score": scores.get('faithfulness', 0.0), "metrics": scores, "status": "verified"}
