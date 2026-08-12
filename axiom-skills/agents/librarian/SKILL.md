---
name: librarian
display_name: "Librarian"
description: "Hybrid vector + keyword search and NVIDIA Nemotron reranking"
type: retriever

config:
  search:
    default_limit: 30
    deep_audit_limit: 60
    default_top_k: 12
    deep_audit_top_k: 20
  deep_audit_flag: "-a"
  no_evidence_response: "Insufficient Evidence."
  empty_context_response: "NO RELEVANT EVIDENCE"
---

# Librarian Agent

The Librarian is the **retrieval and reranking** entry node of the Axiom
agent graph. It does not call an LLM — it orchestrates hybrid search and
reranking against the Supabase vault.

## Purpose

1. Parse `/axm` CLI commands from the raw question.
2. Determine vault mode (empty filenames or `"vault"` in filenames).
3. Adjust search depth: deep audit (`-a` flag) → 60 chunks / top_k=20,
   standard → 30 chunks / top_k=12.
4. Call `hybrid_search()` for initial retrieval.
5. Call `get_reranked_scores()` for NVIDIA Nemotron reranking.
6. Return early with `"no_evidence"` status if no results found.

## Input

- `state["question"]` — may contain `/axm` command prefix.
- `state["user_id"]` — for Supabase RLS scoping.
- `state["filenames"]` — target documents (empty = vault mode).

## Output

- `state["documents"]` — reranked text chunks wrapped in exhibit envelopes.
- `state["command"]` — parsed CLI flags (or `None`).
- `state["question"]` — cleaned question (stripped of `/axm` prefix).
- `state["status"]` — `"thinking"` or `"no_evidence"`.

## Command Flags

| Flag | Effect |
|------|--------|
| `-a` | Deep audit (60 chunks, top_k=20 instead of 30/12) |
| `-c` | Comparative mode (routes to Strategist) |
| `-t` | Table mode (applied by Architect) |
| `-v` | Intensify verification (applied by Prosecutor) |
| `..` | Suppress history context (applied by Architect) |
