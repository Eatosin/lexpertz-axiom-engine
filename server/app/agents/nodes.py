import os
import time
from typing import cast, List, Dict, Any

from langchain_core.pydantic_v1 import SecretStr, BaseModel, Field
from langchain_groq import ChatGroq
from langchain_nvidia_ai_endpoints import ChatNVIDIA
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import Tool
from langchain_experimental.utilities import PythonREPL

# Internal Logic Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import get_reranked_scores 
from app.core.monitor import monitor
from app.prompts.templates import VERIFICATION_PROMPT, DISTILLATION_PROMPT, STRATEGIST_COMPARATIVE_PROMPT
from app.core.evaluator import axiom_evaluator

# --- 1. TOOL ARCHITECTURE ---
python_repl = PythonREPL()
repl_tool = Tool(
    name="python_repl",
    description="A Python shell. Use this to execute math calculations.",
    func=python_repl.run,
)

# --- 2. COST-OPTIMIZED HYBRID BRAIN ---
_groq_key = os.getenv("GROQ_API_KEY")
_nv_key = os.getenv("NVIDIA_API_KEY")
secret_groq = SecretStr(_groq_key) if _groq_key else None

if _nv_key:
    print("AXIOM-CORE: Routing Compute to NVIDIA NIM Grid.")
    # Mypy Fix: Removed .with_retry() from instantiations
    base_llm = ChatNVIDIA(model="meta/llama-3.3-70b-instruct", nvidia_api_key=_nv_key, temperature=0, max_tokens=2048)
    editor_llm_core = ChatNVIDIA(model="nvidia/nvidia-nemotron-nano-9b-v2", nvidia_api_key=_nv_key, temperature=0.1, max_tokens=1024)
    prosecutor_llm_core = ChatNVIDIA(model="nvidia/nemotron-340b-instruct", nvidia_api_key=_nv_key, temperature=0, max_tokens=512)
else:
    print("AXIOM-CORE: NVIDIA Key missing. Fallback to Groq API.")
    base_llm = ChatGroq(temperature=0, model="llama-3.3-70b-versatile", api_key=secret_groq)
    editor_llm_core = ChatGroq(temperature=0, model="llama-3.1-8b-instant", api_key=secret_groq)
    prosecutor_llm_core = base_llm

simple_llm = base_llm 
writer_llm = base_llm.bind_tools([repl_tool])

# --- 3. STRUCTURED OUTPUT MODELS ---
class DistilledContext(BaseModel):
    has_relevant_evidence: bool = Field(description="True if snippets contain facts relevant to the query.")
    brief: str = Field(description="The synthesized evidence brief.")

class HallucinationGrade(BaseModel):
    is_hallucinating: str = Field(description="Must be 'true' or 'false'.")
    explanation: str = Field(description="Detailed logic behind the grade")

editor_llm = editor_llm_core.with_structured_output(DistilledContext)
prosecutor_llm = prosecutor_llm_core.with_structured_output(HallucinationGrade)


# --- 4. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    filenames = state.get("filenames",[])
    is_vault_mode = "vault" in filenames or len(filenames) == 0
    search_input = None if is_vault_mode else filenames
    
    print(f"--- AXIOM: RETRIEVING FROM {', '.join(filenames) if search_input else 'GLOBAL VAULT'} ---")
    
    search_limit = 30 if is_vault_mode or len(filenames) > 1 else 15
    initial_chunks = await hybrid_search(query=state["question"], user_id=state["user_id"], filename=search_input, limit=search_limit)
    
    if not initial_chunks:
        return {"documents":[], "generation": "Insufficient Evidence.", "status": "no_evidence"}

    top_k = 8 if len(filenames) > 1 else 5
    gold_chunks = get_reranked_scores(query=state["question"], documents=initial_chunks, top_k=top_k)
    return {"documents": gold_chunks, "status": "thinking"}

async def distill_node(state: AgentState):
    context_text = monitor.guard_context(state["documents"])
    if not context_text.strip(): 
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    # Mypy Fix: Apply retry logic to the chain execution
    chain = (DISTILLATION_PROMPT | editor_llm).with_retry(stop_after_attempt=3)
    raw_response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    response = cast(DistilledContext, raw_response)
    return {"generation": response.brief if response.has_relevant_evidence else "NO RELEVANT EVIDENCE", "status": "thinking"}

async def strategist_node(state: AgentState):
    print("--- AXIOM: STRATEGIST NODE (COMPARING) ---")
    context_text = monitor.guard_context(state["documents"])
    
    chain = (STRATEGIST_COMPARATIVE_PROMPT | simple_llm).with_retry(stop_after_attempt=3)
    response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    return {"generation": str(response.content), "status": "thinking"}

async def generate_node(state: AgentState):
    distilled_brief = state["generation"]
    
    if "NO RELEVANT EVIDENCE" in distilled_brief or "Insufficient Evidence" in distilled_brief:
        return {"generation": "No direct evidence found in the vault.", "status": "verifying"}

    chain = (VERIFICATION_PROMPT | simple_llm).with_retry(stop_after_attempt=3)
    response = await chain.ainvoke({"context": distilled_brief, "question": state["question"]})
    return {"generation": str(response.content), "status": "verifying"}

async def grade_generation_node(state: AgentState):
    generation = state.get("generation", "")
    if "No direct evidence found" in generation or "Insufficient Evidence" in generation:
        return {"hallucination_score": 1.0, "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0}, "status": "verified"}

    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    
    # Mypy Fix: Apply retry logic directly to the invoke method wrapper
    raw_grade = prosecutor_llm.with_retry(stop_after_attempt=3).invoke(f"FACT CHECK:\nCONTEXT: {context_str}\nDRAFT: {generation}")
    grade = cast(HallucinationGrade, raw_grade)

    if str(grade.is_hallucinating).strip().lower() == "true":
        print(f"❌ LOGIC BREACH: {grade.explanation}")
        return {"hallucination_score": 0.0, "status": "thinking", "retry_count": state.get("retry_count", 0) + 1}

    scores = await axiom_evaluator.score_response(state["question"], generation, context_list)
    return {"hallucination_score": scores.get('faithfulness', 0.0), "metrics": scores, "status": "verified"}
