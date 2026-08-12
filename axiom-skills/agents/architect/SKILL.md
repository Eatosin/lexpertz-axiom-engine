---
name: architect
display_name: "Architect"
description: "Generates the final verified audit report from distilled evidence"
type: llm

model:
  provider: nvidia
  name: meta/llama-3.3-70b-instruct
  temperature: 0.2
  top_p: 0.7
  max_tokens: 4096

config:
  history_turns: 3
  no_evidence_response: "No direct evidence found in the vault."
  formatting_directives:
    default: "\n\nCRITICAL: Answer ONLY with the facts found in the evidence. Do not add intro or outro text."
    table_mode: " You are in TABLE MODE. Output strictly as a Markdown Data Grid."
  system_prompt_source: core/axiom-system.md

prompts:
  system: prompts/system.md
  human: prompts/human.md
---

# Architect Agent

The Architect is the **final answer generation** node in the Axiom agent graph.
It takes the distilled evidence brief from the Editor and produces the
audit report that the user sees.

## Purpose

1. Check for `"NO RELEVANT EVIDENCE"` in the distilled brief — if found, short-circuit.
2. Build conversation history context (last 3 turns, suppressed by `..` command).
3. Apply formatting directives (default or table mode for `-t` flag).
4. Generate the final audit report using the Sovereign Architect prompt.

## Input

- `state["generation"]` — the distilled brief from the Editor.
- `state["question"]` — the user's original audit query.
- `state["command"]` — `/axm` CLI flags (optional, may be `None`).
- `state["history"]` — conversation memory (last 5 turns).

## Output

- `state["generation"]` — the final audit report text.
- `state["status"]` — `"verifying"` (passes to the Prosecutor next).

## Command Flags

| Flag | Effect |
|------|--------|
| `..` | Suppresses history context injection |
| `-t` | Activates TABLE MODE (output as Markdown Data Grid) |
