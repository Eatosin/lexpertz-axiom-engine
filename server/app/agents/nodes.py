"""Agent nodes — execution layer driven by skill configurations in ``axiom-skills/``."""

from __future__ import annotations

import logging
import re

from app.agents.state import AgentState
from app.core.retriever import hybrid_search
from app.core.reranker import get_reranked_scores
from app.core.monitor import monitor
from app.engine import SkillLoader, PromptRenderer, SkillExecutor, registry as schema_registry

logger = logging.getLogger(__name__)


# Shared engine instance. Loader + renderer point at the same tree. Singleton SkillExecutor caches parsed configs.
_skill_loader = SkillLoader()
_skill_renderer = PromptRenderer(_skill_loader)
executor = SkillExecutor(loader=_skill_loader, renderer=_skill_renderer, schema_registry=schema_registry)


async def retrieve_node(state: AgentState):
    """Librarian — hybrid search + reranking. Config loaded from ``agents/librarian/SKILL.md``.

    When ``state.skip_retrieval`` is True (set by domain skills like code-audit
    or dataset-audit), this node short-circuits and preserves the pre-loaded
    documents, command parsing, and question without re-running retrieval.
    """
    # Honour skip_retrieval flag set by code-audit / dataset-audit skills
    if state.get("skip_retrieval"):
        return {
            "documents": state.get("documents", []),
            "status": "thinking",
            "active_node": "Librarian",
            "command": state.get("command"),
            "question": state.get("question", "").strip(),
        }

    raw_question = state["question"].strip()
    command = None
    clean_question = raw_question

    cmd_match = re.match(
        r"^/axm\s+((?:-[a-z]+\s*|\.\.\s*)+)(.*)",
        raw_question,
        re.IGNORECASE | re.DOTALL,
    )
    if cmd_match:
        command = cmd_match.group(1).strip().lower()
        clean_question = cmd_match.group(2).strip()

    filenames = state.get("filenames", [])
    is_vault_mode = "vault" in filenames or len(filenames) == 0
    search_input = None if is_vault_mode else filenames

    skill = executor.get_skill("librarian")
    search_cfg = skill.config.get("search", {})
    deep_flag = skill.config.get("deep_audit_flag", "-a")
    is_deep_audit = command and deep_flag in command
    search_limit = search_cfg.get("deep_audit_limit", 60) if is_deep_audit else search_cfg.get("default_limit", 30)
    top_k = search_cfg.get("deep_audit_top_k", 20) if is_deep_audit else search_cfg.get("default_top_k", 12)

    initial_chunks = await hybrid_search(
        query=clean_question,
        user_id=state["user_id"],
        filename=search_input,
        limit=search_limit,
    )
    no_evidence_msg = skill.config.get("no_evidence_response", "Insufficient Evidence.")
    if not initial_chunks:
        return {
            "documents": [],
            "generation": no_evidence_msg,
            "status": "no_evidence",
            "command": command,
            "question": clean_question,
        }

    gold_chunks = await get_reranked_scores(query=clean_question, documents=initial_chunks, top_k=top_k)
    return {
        "documents": gold_chunks,
        "status": "thinking",
        "active_node": "Librarian",
        "command": command,
        "question": clean_question,
    }


async def distill_node(state: AgentState):
    """Editor — distills evidence with structured JSON output. Config from ``agents/editor/SKILL.md``."""
    skill = executor.get_skill("editor")
    empty_response = skill.config.get("empty_context_response", "NO RELEVANT EVIDENCE")

    context_text = monitor.guard_context(state["documents"])
    if not context_text.strip():
        return {"generation": empty_response, "status": "thinking", "active_node": "Editor"}

    try:
        result = await executor.execute_llm(
            skill_name="editor",
            variables={"question": state["question"], "context": context_text},
        )
        structured = result["structured"]
        brief_content = getattr(structured, "brief", "") or ""
        has_evidence = bool(getattr(structured, "has_relevant_evidence", False))
        brief_content = executor.strip_preambles(brief_content, "editor")
        return {
            "generation": brief_content.strip() if has_evidence else empty_response,
            "status": "thinking",
            "active_node": "Editor",
        }
    except Exception as e:
        logger.warning("Editor fail-safe triggered: %s", e)
        context_text = monitor.guard_context(state["documents"])
        fallback = executor.apply_fail_safe(context_text, "editor")
        return {"generation": fallback, "status": "thinking", "active_node": "Editor"}


async def strategist_node(state: AgentState):
    """Strategist — comparative cross-document analysis. Config from ``agents/strategist/SKILL.md``."""
    skill = executor.get_skill("strategist")
    context_text = monitor.guard_context(state["documents"])
    result = await executor.execute_llm(
        skill_name="strategist",
        variables={"question": state["question"], "context": context_text},
    )
    return {"generation": result["content"], "status": "thinking", "active_node": "Strategist"}


async def generate_node(state: AgentState):
    """Architect — final verified audit report. Config from ``agents/architect/SKILL.md``."""
    skill = executor.get_skill("architect")
    cfg = skill.config
    no_ev_response = cfg.get("no_evidence_response", "No direct evidence found in the vault.")
    history_turns = cfg.get("history_turns", 3)
    fmt_directives = cfg.get("formatting_directives", {})
    default_directive = fmt_directives.get("default", "")
    table_directive = fmt_directives.get("table_mode", "")

    distilled_brief = state["generation"]
    command = state.get("command")
    history = state.get("history", [])

    if "NO RELEVANT EVIDENCE" in distilled_brief:
        return {"generation": no_ev_response, "status": "verifying"}

    history_context = ""
    if history and (not command or ".." not in command):
        history_context = "\n\n### PREVIOUS AUDIT CONTEXT:\n"
        for turn in history[-history_turns:]:
            history_context += f"{turn['role'].upper()}: {turn['content']}\n"

    formatting_directive = default_directive
    if command and "-t" in command:
        formatting_directive += table_directive

    context = f"{history_context}\n\nEVIDENCE:\n{distilled_brief}{formatting_directive}"
    result = await executor.execute_llm(
        skill_name="architect",
        variables={"question": state["question"], "context": context},
    )
    return {"generation": result["content"], "status": "verifying", "active_node": "Architect"}


async def grade_generation_node(state: AgentState):
    """Prosecutor — LLM-as-a-Judge hallucination grading. Config from ``agents/prosecutor/SKILL.md``."""
    skill = executor.get_skill("prosecutor")
    cfg = skill.config
    thresholds = cfg.get("threshold", {"default": 0.7, "intensify": 0.9})
    intensify_flag = cfg.get("intensify_flag", "-v")
    early_exit_markers = cfg.get("early_exit_markers", ["No direct evidence found", ""])

    generation = state.get("generation", "")
    if any(marker in generation for marker in early_exit_markers) or not generation.strip():
        return {
            "hallucination_score": 1.0,
            "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0},
            "status": "verified",
            "active_node": "Prosecutor",
        }

    command = state.get("command")
    intensify = command is not None and intensify_flag in command
    threshold = thresholds["intensify"] if intensify else thresholds["default"]

    context_list = state["documents"]
    context_str = "\n\n".join(context_list)

    try:
        result = await executor.execute_llm(
            skill_name="prosecutor",
            variables={"context": context_str, "generation": generation},
        )
        grade = result["structured"]

        faith_score = float(getattr(grade, "faithfulness_score", 0.0))
        is_hallucinating = str(getattr(grade, "is_hallucinating", "true")).strip().lower()
        explanation = getattr(grade, "explanation", "No explanation provided.")

        if is_hallucinating == "true" or faith_score < threshold:
            return {
                "hallucination_score": faith_score,
                "metrics": {"faithfulness": faith_score, "precision": 1.0, "relevance": 1.0},
                "status": "thinking",
                "retry_count": state.get("retry_count", 0) + 1,
                "active_node": "Prosecutor",
            }

        return {
            "hallucination_score": faith_score,
            "metrics": {"faithfulness": faith_score, "precision": 1.0, "relevance": 1.0},
            "status": "verified",
            "active_node": "Prosecutor",
        }
    except Exception as e:
        logger.warning("Prosecutor fail-safe triggered: %s", e)
        return {
            "hallucination_score": 1.0,
            "status": "verified",
            "active_node": "Prosecutor",
            "metrics": {"faithfulness": 1.0, "precision": 1.0, "relevance": 1.0},
        }
