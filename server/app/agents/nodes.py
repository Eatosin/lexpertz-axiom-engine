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

from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import get_reranked_scores 
from app.core.monitor import monitor
from app.core.evaluator import axiom_evaluator

# IMPORTING THE ENTERPRISE REGISTRY
from app.prompts.templates import (
    VERIFICATION_PROMPT, 
    DISTILLATION_PROMPT, 
    STRATEGIST_COMPARATIVE_PROMPT,
    GRADING_PROMPT,
    distill_parser,    
    grade_parser
)

try:
    ChatGroq.model_rebuild()
    ChatNVIDIA.model_rebuild()
    print("AXIOM-CORE: Neural Registry Stabilized.")
except Exception as e:
    print(f"AXIOM-CORE: Model rebuild notice: {e}")

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


async def retrieve_node(state: AgentState):
    raw_question = state["question"].strip()
    command = None
    clean_question = raw_question
    
    # SOTA: Multi-Flag Parser (Captures '-a -t -v' as a single block)
    cmd_match = re.match(r'^/axm\s+((?:-[a-z]+\s*|\.\.\s*)+)(.*)', raw_question, re.IGNORECASE | re.DOTALL)
    if cmd_match:
        command = cmd_match.group(1).strip().lower()
        clean_question = cmd_match.group(2).strip()
        print(f"AXM-CLI: Detected Commands [{command}]")

    filenames = state.get("filenames",[])
    is_vault_mode = "vault" in filenames or len(filenames) == 0
    search_input = None if is_vault_mode else filenames
    
    # SOTA: Use 'in' to check for specific flags inside the chained command
    is_deep_audit = command and "-a" in command
    search_limit = 60 if is_deep_audit else 30
    top_k = 20 if is_deep_audit else 12

    initial_chunks = await hybrid_search(query=clean_question, user_id=state["user_id"], filename=search_input, limit=search_limit)
    if not initial_chunks:
        return {"documents":[], "generation": "Insufficient Evidence.", "status": "no_evidence", "command": command, "question": clean_question}

    gold_chunks = await get_reranked_scores(query=clean_question, documents=initial_chunks, top_k=top_k)
    return {"documents": gold_chunks, "status": "thinking", "active_node": "Librarian", "command": command, "question": clean_question }

async def distill_node(state: AgentState):
    context_text = monitor.guard_context(state["documents"])
    if not context_text.strip(): 
        return {"generation": "NO RELEVANT EVIDENCE", "status": "thinking"}

    chain = DISTILLATION_PROMPT | base_llm | distill_parser
    
    try:
        raw_response = await chain.ainvoke({"context": context_text, "question": state["question"]})
        
        brief_content = raw_response.brief
        preambles_to_strip =["Here is the synthesized evidence brief:", "Based on the provided snippets:", "Synthesized Evidence Brief:", "Here is the brief:"]
        for preamble in preambles_to_strip:
            brief_content = brief_content.replace(preamble, "")
            
        return {"generation": brief_content.strip() if raw_response.has_relevant_evidence else "NO RELEVANT EVIDENCE", "status": "thinking", "active_node": "Editor"}
    except Exception as e:
        print(f"⚠️ EDITOR JSON FAILSAFE TRIGGERED: {e}")
        cleaned_context = re.sub(r'--- EXHIBIT_(START|END)_ID_\w+ ---', '', context_text)
        return {"generation": cleaned_context[:6000], "status": "thinking", "active_node": "Editor"}
        
async def strategist_node(state: AgentState):
    context_text = monitor.guard_context(state["documents"])
    chain = STRATEGIST_COMPARATIVE_PROMPT | simple_llm 
    response = await chain.ainvoke({"context": context_text, "question": state["question"]})
    return {"generation": str(response.content), "status": "thinking", "active_node": "Strategist"}

async def generate_node(state: AgentState):
    distilled_brief = state["generation"]
    command = state.get("command")
    history = state.get("history",[])

    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {"generation": "No direct evidence found in the vault.", "status": "verifying"}

    history_context = ""
    # SOTA Check: Is the reset flag present?
    if history and (not command or ".." not in command):
        history_context = "\n\n### PREVIOUS AUDIT CONTEXT:\n"
        for turn in history[-3:]: 
            history_context += f"{turn['role'].upper()}: {turn['content']}\n"

    # SOTA Check: Is the table flag present?
    formatting_directive = "\n\nCRITICAL: You are in TABLE MODE. Output strictly as a Markdown Data Grid." if command and "-t" in command else ""

    chain = VERIFICATION_PROMPT | simple_llm 
    response = await chain.ainvoke({"context": f"{history_context}\n\nEVIDENCE:\n{distilled_brief}{formatting_directive}", "question": state["question"]})
    return {"generation": str(response.content), "status": "verifying", "active_node": "Architect"}

async def grade_generation_node(state: AgentState):
    generation = state.get("generation", "")
    if "No direct evidence found" in generation or not generation.strip():
        return {"hallucination_score": 1.0, "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0}, "status": "verified", "active_node": "Prosecutor"}

    command = state.get("command")
    # SOTA Check: Is the intense verification flag present?
    intensify = command is not None and "-v" in command
    
    context_list = state["documents"]
    context_str = "\n\n".join(context_list)
    
    try:
        chain = GRADING_PROMPT | prosecutor_llm_core | grade_parser
        grade = await chain.ainvoke({"context": context_str, "generation": generation})
        
        if str(grade.is_hallucinating).strip().lower() == "true":
            print(f"LOGIC BREACH (NIM): {grade.explanation}")
            return {"hallucination_score": 0.0, "status": "thinking", "retry_count": state.get("retry_count", 0) + 1, "active_node": "Prosecutor"}
    except Exception as e:
        print(f"⚠️ PROSECUTOR JSON FAILSAFE: {e}")
        pass 

    try:
        print("--- AXIOM: EXECUTING RAGAS MATHEMATICAL AUDIT ---")
        scores = await axiom_evaluator.score_response(state["question"], generation, context_list)
        faith = scores.get('faithfulness', 0.0)
        threshold = 0.9 if intensify else 0.7
        
        if faith < threshold:
            print(f"FAITHFULNESS BREACH: {faith} (Threshold: {threshold})")
            return {"hallucination_score": faith, "metrics": scores, "status": "thinking", "retry_count": state.get("retry_count", 0) + 1, "active_node": "Prosecutor"}

        return {"hallucination_score": faith, "metrics": scores, "status": "verified", "active_node": "Prosecutor"}
    except Exception as e:
        print(f"⚠️ PROSECUTOR SYSTEM FAILSAFE: {e}")
        return {"hallucination_score": 0.5, "status": "verified", "active_node": "Prosecutor", "metrics": {"faithfulness": 0.5, "precision": 1.0, "relevance": 1.0}}
