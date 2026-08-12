---
name: editor
display_name: "Editor"
description: "Distills retrieved evidence into structured JSON briefs with exhibit marker preservation"
type: llm

model:
  provider: nvidia
  name: meta/llama-3.3-70b-instruct
  temperature: 0.0
  top_p: 0.95
  max_tokens: 2048
  response_format: json_object

structured_output:
  schema_name: DistilledContext
  parser: PydanticOutputParser

config:
  preambles_to_strip:
    - "Here is the synthesized evidence brief:"
    - "Based on the provided snippets:"
    - "Synthesized Evidence Brief:"
    - "Here is the brief:"
  empty_context_response: "NO RELEVANT EVIDENCE"
  no_evidence_response: "NO RELEVANT EVIDENCE"

fail_safe:
  strategy: strip_exhibit_markers
  max_length: 6000

prompts:
  system: prompts/system.md
  human: prompts/human.md
---

# Editor Agent

The Editor is the **evidence distillation** node in the Axiom agent graph.
It sits between the Librarian (retrieval) and the Architect (generation).

## Purpose

1. Receive raw RAG snippets from the Librarian.
2. Clean noise, remove redundant metadata, and preserve exact exhibit markers.
3. Output a structured JSON object containing a high-density evidence brief.
4. Gate downstream generation: if no relevant evidence is found, short-circuit
   the pipeline with `"NO RELEVANT EVIDENCE"`.

## Input

- `state["documents"]` — list of retrieved text chunks wrapped in exhibit envelopes.
- `state["question"]` — the user's audit query.

## Output

- `state["generation"]` — the distilled evidence brief (or `"NO RELEVANT EVIDENCE"`).
- `state["status"]` — always `"thinking"`.

## Structured Output Schema

The LLM returns a `DistilledContext` Pydantic object:

| Field | Type | Description |
|-------|------|-------------|
| `scratchpad` | `str` | Step-by-step reasoning about what the user wants |
| `has_relevant_evidence` | `bool` | True only if snippets contain facts answering the query |
| `brief` | `str` | Synthesized evidence with preserved exhibit markers |

## Fail-Safe

If the LLM fails to return valid JSON, the Editor strips exhibit markers from
the raw context and returns the first 6000 characters as a degraded brief.
This prevents the pipeline from crashing on LLM formatting errors.
