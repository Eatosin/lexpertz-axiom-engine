import os
import time
from typing import cast, List, Dict, Any
from pydantic import SecretStr, BaseModel, Field

# Core AI Dependencies
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import Tool
from langchain_experimental.utilities import PythonREPL # type: ignore

# Internal Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import reranker
from app.core.monitor import monitor # <--- NEW: KV-Cache Shield
from app.prompts.templates import VERIFICATION_PROMPT, DISTILLATION_PROMPT

# --- 1. TOOL ARCHITECTURE ---
python_repl = PythonREPL()
repl_tool = Tool(
    name="python_repl",
    description="A Python shell. Use this to execute math calculations. Input should be valid python code.",
    func=python_repl.run,
)

# --- 2. BRAIN CONFIGURATION ---
_env_key = os.getenv("GROQ_API_KEY")
secret_key = SecretStr(_env_key) if _env_key else None

# ARCHITECT: Llama 3.3 70B (Deep Reasoning)
base_llm = ChatGroq(
    temperature=0, 
    model="llama-3.3-70b-versatile", 
    api_key=secret_key
)
writer_llm = base_llm.bind_tools([repl_tool])

# DISTILLER/GRADER: Llama 3.1 8B (Efficiency Tier)
grader_llm = ChatGroq(
    temperature=0, 
    model="llama-3.1-8b-instant", 
    api_key=secret_key
)

# --- 3. STRUCTURED OUTPUT MODEL (The Prosecutor) ---
class HallucinationGrade(BaseModel):
    is_hallocinating: bool = Field(description="True if the answer contains info not found in the context")
    explanation: str = Field(description="Detailed logic behind the grade")

prosecutor_llm = base_llm.with_structured_output(HallucinationGrade)

# --- 4. GRAPH NODES ---
async def retrieve_node(state: AgentState):
    """
    Station 1: Evidence Retrieval & Reranking.
    Implements a hard-stop for empty-vault scenarios to prevent hallucination loops.
    """
    print("--- AXIOM: RETRIEVING EVIDENCE ---")
    initial_chunks = await hybrid_search(
        query=state["question"], 
        user_id=state["user_id"], 
        limit=20
    )
    
    # SOTA: Short-circuit logic if no relevant context exists
    if not initial_chunks:
        print("⚠️ VAULT-SILENCE: No documents found for this query.")
        return {
            "documents": [], 
            "generation": "Insufficient Evidence: The document vault does not contain data related to this query. Please refine your question or upload additional context.", 
            "status": "no_evidence", # Explicit terminal state
            "hallucination_score": 0.0
        }

    # Execute Reranking (BGE Large)
    reranked_results = reranker.rerank(state["question"], initial_chunks)
    gold_chunks = [str(r.get("text", "")) for r in reranked_results]
    
    return {"documents": gold_chunks, "status": "thinking"}

async def distill_node(state: AgentState):
    """
    Station 1.5: Context Editor (The Filter)
    Uses Tiktoken monitor and 8B model to generate an Evidence Brief.
    """
    print("--- AXIOM: DISTILLING CONTEXT (8B) ---")
    
    # SOTA: Guarding against Context Overflow for 100+ page docs
    context_text = monitor.guard_context(state["documents"])
    
    if not context_text.strip():
        return {"generation": "NO RELEVANT EVIDENCE FOUND", "status": "thinking"}

    chain = DISTILLATION_PROMPT | grader_llm
    response = await chain.ainvoke({
        "context": context_text, 
        "question": state["question"]
    })
    
    return {"generation": str(response.content), "status": "thinking"}

async def generate_node(state: AgentState):
    """
    Station 2: Synthesized Reasoning (The Architect)
    Uses 70B model to reason over the Distilled Brief.
    """
    print("--- AXIOM: FINAL REASONING (70B) ---")
    
    distilled_brief = state["generation"]
    
    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {"generation": "I cannot verify an answer as the document contains no relevant data.", "status": "verifying"}

    chain = VERIFICATION_PROMPT | writer_llm
    response = await chain.ainvoke({
        "context": distilled_brief, 
        "question": state["question"]
    })
    
    return {"generation": str(response.content), "status": "verifying"}

async def grade_generation_node(state: AgentState):
    """
    Station 3: Adversarial Audit (The Prosecutor)
    """
    print("--- AXIOM: ADVERSARIAL CRITIQUE (Llama-Guard) ---")
    context = "\n\n".join(state["documents"])
    generation = state["generation"]

    raw_grade = prosecutor_llm.invoke(
        f"AUDIT PROTOCOL: Cross-reference generation against context.\n\n"
        f"CONTEXT: {context}\n\n"
        f"GENERATION: {generation}"
    )
    
    grade = cast(HallucinationGrade, raw_grade)

    if grade.is_hallocinating:
        print(f"❌ LOGIC BREACH: {grade.explanation}")
        return {"hallucination_score": 0.0, "status": "thinking"}
    
    print("EVIDENCE VERIFIED")
    return {"hallucination_score": 1.0, "status": "verified"}
