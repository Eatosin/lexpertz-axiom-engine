import os
import time
import re
from typing import cast, List, Dict, Any, Union, Optional

from langchain_core.caches import BaseCache
from langchain_core.callbacks import Callbacks
from langchain_core.outputs import ChatResult
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

# --- NEURAL STABILIZER V2 ---
try:
    ChatGroq.model_rebuild()
    ChatNVIDIA.model_rebuild()
    print("AXIOM-CORE: Neural Registry Stabilized.")
except Exception as e:
    print(f"AXIOM-CORE: Model rebuild notice: {e}")

# --- 1. BRAIN CONFIGURATION ---
_nv_key = os.getenv("NVIDIA_API_KEY")
_groq_key = os.getenv("GROQ_API_KEY")

base_llm: Any 
editor_llm_core: Any
prosecutor_llm_core: Any

if _nv_key:
    try:
        base_llm = ChatNVIDIA(model="meta/llama-3.3-70b-instruct", nvidia_api_key=_nv_key, temperature=0, max_tokens=2048)
        editor_llm_core = ChatNVIDIA(model="nvidia/nvidia-nemotron-nano-9b-v2", nvidia_api_key=_nv_key, temperature=0.1, max_tokens=1024)
        prosecutor_llm_core = ChatNVIDIA(model="meta/llama-3.1-405b-instruct", nvidia_api_key=_nv_key, temperature=0, max_tokens=512)
    except: _nv_key = None

if not _nv_key:
    base_llm = ChatGroq(temperature=0, model="llama-3.3-70b-versatile", api_key=SecretStr(_groq_key) if _groq_key else None) # type: ignore
    editor_llm_core = ChatGroq(temperature=0, model="llama-3.1-8b-instant", api_key=SecretStr(_groq_key) if _groq_key else None) # type: ignore
    prosecutor_llm_core = base_llm

simple_llm = base_llm 

# --- 2. STRUCTURED OUTPUT MODELS ---
class DistilledContext(BaseModel):
    has_relevant_evidence: bool = Field(description="True if snippets contain facts relevant to the query.")
    brief: str = Field(description="The synthesized evidence brief.")

class HallucinationGrade(BaseModel):
    is_hallucinating: str = Field(description="Must be 'true' or 'false'.")
    explanation: str = Field(description="Detailed logic behind the grade")

editor_llm = editor_llm_core.with_structured_output(DistilledContext)
prosecutor_llm = prosecutor_llm_core.with_structured_output(HallucinationGrade)


# --- 3. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    """Station: Librarian (Command-Aware Evidence Retrieval)"""
    raw_question = state["question"].strip()
    
    # --- V4.6 COMMAND PARSER ---
    command = None
    clean_question = raw_question
    
    # Regex detects "/axm -flag" or "/axm .."
    cmd_match = re.match(r'^/axm\s+(-[atvhc]|\.\.)\s*(.*)', raw_question, re.IGNORECASE)
    if cmd_match:
        command = cmd_match.group(1).lower()
        clean_question = cmd_match.group(2).strip()
        print(f"AXM-CLI: Detected Command [{command}]")

    filenames = state.get("filenames", [])
    is_vault_mode = "vault" in filenames or len(filenames) == 0
    search_input = None if is_vault_mode else filenames
    
    # LOGIC ADJUSTMENT: Deep Audit Mode (-a)
    search_limit = 60 if command == "-a" else 30
    top_k = 20 if command == "-a" else 12

    initial_chunks = await hybrid_search(
        query=clean_question, 
        user_id=state["user_id"], 
        filename=search_input, 
        limit=search_limit
    )
    
    if not initial_chunks:
        return {"documents": [], "generation": "Insufficient Evidence.", "status": "no_evidence", "command": command, "question": clean_question}

    gold_chunks = get_reranked_scores(query=clean_question, documents=initial_chunks, top_k=top_k)
    
    return {
        "documents": gold_chunks, 
        "status": "thinking", 
        "active_node": "Librarian",
        "command": command,
        "question": clean_question # Pass cleaned question forward
    }

async def distill_node(state: AgentState):
    """Station: Editor"""
    context_text = monitor.guard_context(state["documents"])
    if not context_text.strip(): return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    chain = DISTILLATION_PROMPT | editor_llm
    raw_response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    response = cast(DistilledContext, raw_response)
    
    # Clean exhibit tags from distillation to prevent PDF leakage
    cleaned_brief = re.sub(r'--- EXHIBIT_(START|END)_ID_\w+ ---', '', response.brief)
    
    return {
        "generation": cleaned_brief if response.has_relevant_evidence else "NO RELEVANT EVIDENCE", 
        "status": "thinking",
        "active_node": "Editor"
    }

async def strategist_node(state: AgentState):
    """Station: Strategist (Comparative Mode)"""
    context_text = monitor.guard_context(state["documents"])
    chain = STRATEGIST_COMPARATIVE_PROMPT | simple_llm 
    response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    return {"generation": str(response.content), "status": "thinking", "active_node": "Strategist"}

async def generate_node(state: AgentState):
    """Station: Architect (Memory-Aware Reasoning)"""
    distilled_brief = state["generation"]
    command = state.get("command")
    history = state.get("history", [])

    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {"generation": "No direct evidence found in the vault.", "status": "verifying"}

    # --- V4.6 MEMORY INJECTION ---
    # Construct history block if /axm .. was NOT used
    history_context = ""
    if command != ".." and history:
        history_context = "\n\n### PREVIOUS AUDIT CONTEXT:\n"
        for turn in history[-3:]: # Inject last 3 turns for focus
            history_context += f"{turn['role'].upper()}: {turn['content']}\n"

    # --- V4.6 COMMAND OVERRIDES ---
    formatting_directive = ""
    if command == "-t":
        formatting_directive = "\n\nCRITICAL: You are in TABLE MODE. Output the response ONLY as a strictly formatted Markdown Data Grid."

    chain = VERIFICATION_PROMPT | simple_llm 
    response = await chain.ainvoke({
        "context": f"{history_context}\n\nEVIDENCE:\n{distilled_brief}{formatting_directive}", 
        "question": state["question"]
    })
    
    return {"generation": str(response.content), "status": "verifying", "active_node": "Architect"}

async def grade_generation_node(state: AgentState):
    """Station: Prosecutor"""
    generation = state.get("generation", "")
    if "No direct evidence found" in generation or not generation.strip():
        return {"hallucination_score": 1.0, "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0}, "status": "verified"}

    # Intensive Verification for -v command
    intensify = state.get("command") == "-v"
    
    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    
    try:
        raw_grade = prosecutor_llm.invoke(f"FACT CHECK PROTOCOL:\nCONTEXT: {context_str}\nDRAFT: {generation}")
        if raw_grade:
            grade = cast(HallucinationGrade, raw_grade)
            if str(grade.is_hallucinating).strip().lower() == "true":
                return {"hallucination_score": 0.0, "status": "thinking", "retry_count": state.get("retry_count", 0) + 1}

        scores = await axiom_evaluator.score_response(state["question"], generation, context_list)
        faith = scores.get('faithfulness', 0.0)
        
        # If -v is used, we drop the pass threshold to 0.9 (Standard is 0.7)
        threshold = 0.9 if intensify else 0.7
        
        if faith < threshold:
            return {"hallucination_score": faith, "status": "thinking", "retry_count": state.get("retry_count", 0) + 1}

        return {"hallucination_score": faith, "metrics": scores, "status": "verified", "active_node": "Prosecutor"}
    except:
        return {"hallucination_score": 0.5, "status": "verified"}
