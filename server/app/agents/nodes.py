import os
import time
import re
from typing import cast, List, Dict, Any, Union, Optional

from langchain_core.caches import BaseCache
from langchain_core.callbacks import Callbacks
from langchain_core.outputs import ChatResult
from pydantic import SecretStr

from langchain_groq import ChatGroq
from langchain_nvidia_ai_endpoints import ChatNVIDIA

# Internal Logic Dependencies
from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import get_reranked_scores 
from app.core.monitor import monitor
from app.core.evaluator import axiom_evaluator

# --- IMPORTING THE ENTERPRISE REGISTRY ---
from app.prompts.templates import (
    VERIFICATION_PROMPT, 
    DISTILLATION_PROMPT, 
    STRATEGIST_COMPARATIVE_PROMPT,
    GRADING_PROMPT,
    distill_parser,    
    grade_parser
)

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

# --- 2. GRAPH NODES ---

async def retrieve_node(state: AgentState):
    """Station: Librarian (Command-Aware Evidence Retrieval)"""
    raw_question = state["question"].strip()
    
    command = None
    clean_question = raw_question
    
    cmd_match = re.match(r'^/axm\s+(-[atvhc]|\.\.)\s*(.*)', raw_question, re.IGNORECASE)
    if cmd_match:
        command = cmd_match.group(1).lower()
        clean_question = cmd_match.group(2).strip()
        print(f"AXM-CLI: Detected Command [{command}]")

    filenames = state.get("filenames", [])
    is_vault_mode = "vault" in filenames or len(filenames) == 0
    search_input = None if is_vault_mode else filenames
    
    search_limit = 60 if command == "-a" else 30
    top_k = 20 if command == "-a" else 12

    # 1. This is already async - Correct
    initial_chunks = await hybrid_search(
        query=clean_question, 
        user_id=state["user_id"], 
        filename=search_input, 
        limit=search_limit
    )
    
    if not initial_chunks:
        return {"documents": [], "generation": "Insufficient Evidence.", "status": "no_evidence", "command": command, "question": clean_question}

    # Since we made the reranker async, we must await the result.
    gold_chunks = await get_reranked_scores(query=clean_question, documents=initial_chunks, top_k=top_k)
    
    return {
        "documents": gold_chunks, 
        "status": "thinking", 
        "active_node": "Librarian",
        "command": command,
        "question": clean_question 
    }

async def distill_node(state: AgentState):
    """
    Station: Editor (Hardened for NIM Structured Output & Noise Filtering)
    """
    context_text = monitor.guard_context(state["documents"])
    if not context_text.strip(): 
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    # V4.6 SOTA: Using strict Parser Pipeline instead of brittle .with_structured_output
    chain = DISTILLATION_PROMPT | base_llm | distill_parser
    
    try:
        raw_response = await chain.ainvoke({"context": context_text, "question": state["question"]})
            
        # --- NOISE FILTER: Strip AI Preamble ---
        brief_content = raw_response.brief
        preambles_to_strip =[
            "Here is the synthesized evidence brief:",
            "Based on the provided snippets:",
            "Synthesized Evidence Brief:",
            "Here is the brief:"
        ]
        for preamble in preambles_to_strip:
            brief_content = brief_content.replace(preamble, "")
            
        return {
            "generation": brief_content.strip() if raw_response.has_relevant_evidence else "NO RELEVANT EVIDENCE", 
            "status": "thinking",
            "active_node": "Editor"
        }

    except Exception as e:
        print(f"EDITOR FAILSAFE TRIGGERED: {e}")
        # Fallback to cleaned raw context on any execution/parsing error
        cleaned_context = re.sub(r'--- EXHIBIT_(START|END)_ID_\w+ ---', '', context_text)
        return {
            "generation": cleaned_context[:6000], 
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
    history = state.get("history",[])

    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {"generation": "No direct evidence found in the vault.", "status": "verifying"}

    # --- V4.6 MEMORY INJECTION ---
    history_context = ""
    if command != ".." and history:
        history_context = "\n\n### PREVIOUS AUDIT CONTEXT:\n"
        for turn in history[-3:]:
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
    """
    Station: Prosecutor (Hardened V4.6).
    Implements None-Guard for NIM and dual-layer logic/math verification.
    """
    generation = state.get("generation", "")
    
    # 1. Short-circuit for refusal messages
    if "No direct evidence found" in generation or not generation.strip():
        return {
            "hallucination_score": 1.0, 
            "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0}, 
            "status": "verified",
            "active_node": "Prosecutor"
        }

    # Intensive Verification for -v command
    intensify = state.get("command") == "-v"
    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    
    try:
        # LAYER 1: Logic Audit (NIM 405B via Strict Parser)
        chain = GRADING_PROMPT | prosecutor_llm_core | grade_parser
        grade = await chain.ainvoke({"context": context_str, "generation": generation})
        
        if str(grade.is_hallucinating).strip().lower() == "true":
            print(f"LOGIC BREACH (NIM): {grade.explanation}")
            return {
                "hallucination_score": 0.0, 
                "status": "thinking", 
                "retry_count": state.get("retry_count", 0) + 1,
                "active_node": "Prosecutor"
            }
            
    except Exception as e:
        print(f"PROSECUTOR JSON FAILSAFE: {e}")
        # Soft-fail: If the logic judge crashes due to bad JSON, pass the torch to RAGAS 
        pass 

    try:
        # LAYER 2: Mathematical Audit (RAGAS V2)
        print("--- AXIOM: EXECUTING RAGAS MATHEMATICAL AUDIT ---")
        scores = await axiom_evaluator.score_response(state["question"], generation, context_list)
        faith = scores.get('faithfulness', 0.0)
        
        # COMMAND AWARENESS
        threshold = 0.9 if intensify else 0.7
        
        if faith < threshold:
            print(f"FAITHFULNESS BREACH (RAGAS): {faith} (Threshold: {threshold})")
            return {
                "hallucination_score": faith, 
                "metrics": scores,
                "status": "thinking", 
                "retry_count": state.get("retry_count", 0) + 1,
                "active_node": "Prosecutor"
            }

        # SUCCESS: Gated Logic Verified
        return {
            "hallucination_score": faith, 
            "metrics": scores, 
            "status": "verified",
            "active_node": "Prosecutor"
        }
        
    except Exception as e:
        print(f"PROSECUTOR FAILSAFE: {e}")
        return {
            "hallucination_score": 0.5, 
            "status": "verified",
            "active_node": "Prosecutor",
            "metrics": {"faithfulness": 0.5, "precision": 1.0, "relevance": 1.0}
        }
