import os
import time
from typing import cast, List, Dict, Any, Union

# SOTA: Fix for Pydantic V2 "BaseCache" undefined error
from langchain_core.caches import BaseCache
from pydantic import BaseModel, Field, SecretStr

from langchain_groq import ChatGroq
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate

# Internal Logic Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import get_reranked_scores 
from app.core.monitor import monitor
from app.prompts.templates import VERIFICATION_PROMPT, DISTILLATION_PROMPT, STRATEGIST_COMPARATIVE_PROMPT
from app.core.evaluator import axiom_evaluator

# --- NEURAL STABILIZER ---
# Manually force Pydantic to resolve internal LangChain references (BaseCache)
try:
    ChatGroq.model_rebuild()
    ChatNVIDIA.model_rebuild()
except Exception as e:
    print(f"AXIOM-CORE: Model rebuild notice: {e}")

# --- 1. BRAIN CONFIGURATION (NVIDIA NIM V4.4) ---
_groq_key = os.getenv("GROQ_API_KEY")
_nv_key = os.getenv("NVIDIA_API_KEY")

base_llm: Any 
editor_llm_core: Any
prosecutor_llm_core: Any

if _nv_key:
    print("AXIOM-CORE: Routing Compute to NVIDIA NIM Grid (V4.4).")
    try:
        base_llm = ChatNVIDIA(
            model="meta/llama-3.3-70b-instruct", 
            api_key=_nv_key, 
            temperature=0
        )
        editor_llm_core = ChatNVIDIA(
            model="nvidia/nvidia-nemotron-nano-9b-v2", 
            api_key=_nv_key, 
            temperature=0.1
        )
        prosecutor_llm_core = ChatNVIDIA(
            model="meta/llama-3.1-405b-instruct", 
            api_key=_nv_key, 
            temperature=0
        )
    except Exception as e:
        print(f"⚠️ NVIDIA NIM HANDSHAKE ERROR: {e}. Falling back to Groq.")
        _nv_key = None

if not _nv_key:
    print("AXIOM-CORE: NVIDIA Offline. Fallback to Groq API.")
    base_llm = ChatGroq(
        temperature=0, 
        model="llama-3.3-70b-versatile", 
        api_key=SecretStr(_groq_key) if _groq_key else None
    )
    editor_llm_core = ChatGroq(
        temperature=0, 
        model="llama-3.1-8b-instant", 
        api_key=SecretStr(_groq_key) if _groq_key else None
    )
    prosecutor_llm_core = base_llm

simple_llm = base_llm 

# --- 2. STRUCTURED OUTPUT MODELS (Pydantic V2 Native) ---
class DistilledContext(BaseModel):
    has_relevant_evidence: bool = Field(description="True if snippets contain facts relevant to the query.")
    brief: str = Field(description="The synthesized evidence brief.")

class HallucinationGrade(BaseModel):
    is_hallucinating: str = Field(description="Must be 'true' or 'false'.")
    explanation: str = Field(description="Detailed logic behind the grade")

# Bind Structured Outputs
editor_llm = editor_llm_core.with_structured_output(DistilledContext)
prosecutor_llm = prosecutor_llm_core.with_structured_output(HallucinationGrade)


# --- 3. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    """Station: Librarian (Evidence Retrieval)"""
    filenames = state.get("filenames", [])
    is_vault_mode = "vault" in filenames or len(filenames) == 0
    search_input = None if is_vault_mode else filenames
    
    print(f"--- AXIOM: RETRIEVING FROM {', '.join(filenames) if search_input else 'GLOBAL VAULT'} ---")
    
    search_limit = 30 if is_vault_mode or len(filenames) > 1 else 15
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
    
    return {"documents": gold_chunks, "status": "thinking", "active_node": "Librarian"}

async def distill_node(state: AgentState):
    """Station: Editor"""
    context_text = monitor.guard_context(state["documents"])
    if not context_text.strip(): return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    chain = DISTILLATION_PROMPT | editor_llm
    raw_response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    response = cast(DistilledContext, raw_response)
    return {
        "generation": response.brief if response.has_relevant_evidence else "NO RELEVANT EVIDENCE", 
        "status": "thinking",
        "active_node": "Editor"
    }

async def strategist_node(state: AgentState):
    """Station: Strategist"""
    print("--- AXIOM: STRATEGIST NODE (COMPARING) ---")
    context_text = monitor.guard_context(state["documents"])
    
    chain = STRATEGIST_COMPARATIVE_PROMPT | simple_llm 
    response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    return {"generation": str(response.content), "status": "thinking", "active_node": "Strategist"}

async def generate_node(state: AgentState):
    """Station: Architect"""
    distilled_brief = state["generation"]
    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {"generation": "No direct evidence found in the vault.", "status": "verifying"}

    chain = VERIFICATION_PROMPT | simple_llm 
    response = await chain.ainvoke({"context": distilled_brief, "question": state["question"]})
    return {"generation": str(response.content), "status": "verifying", "active_node": "Architect"}

async def grade_generation_node(state: AgentState):
    """Station: Prosecutor"""
    generation = state.get("generation", "")
    if "No direct evidence found" in generation:
        return {
            "hallucination_score": 1.0, 
            "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0}, 
            "status": "verified"
        }

    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    
    raw_grade = prosecutor_llm.invoke(f"FACT CHECK PROTOCOL:\nCONTEXT: {context_str}\nDRAFT: {generation}")
    grade = cast(HallucinationGrade, raw_grade)

    if str(grade.is_hallucinating).strip().lower() == "true":
        print(f"❌ LOGIC BREACH: {grade.explanation}")
        return {
            "hallucination_score": 0.0, 
            "status": "thinking", 
            "retry_count": state.get("retry_count", 0) + 1,
            "active_node": "Prosecutor"
        }

    scores = await axiom_evaluator.score_response(state["question"], generation, context_list)
    return {
        "hallucination_score": scores.get('faithfulness', 0.0), 
        "metrics": scores, 
        "status": "verified",
        "active_node": "Prosecutor"
    }
