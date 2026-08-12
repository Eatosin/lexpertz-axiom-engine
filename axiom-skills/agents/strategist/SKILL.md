---
name: strategist
display_name: "Strategist"
description: "Multi-document comparative cross-domain audit analysis"
type: llm

model:
  provider: nvidia
  name: meta/llama-3.3-70b-instruct
  temperature: 0.2
  top_p: 0.7
  max_tokens: 4096

prompts:
  system: prompts/system.md
  human: prompts/human.md
---

# Strategist Agent

The Strategist is the **comparative analysis** node used for multi-document
audits. It is activated when the `-c` flag is present or more than one
filename is targeted.

## Purpose

1. Receive merged context from multiple documents.
2. Identify contradictions, reconciliation failures, and implementation gaps.
3. Produce a comparative matrix mapping specific deviations across sources.

## Output Protocol

1. Dynamic Header: `### [Topic] COMPARATIVE MATRIX`
2. Comparative Matrix: Markdown table (Feature/Clause | Source 1 | Source 2 | Risk Delta)
3. Synthesis Summary: Brief executive summary below the table
4. Strict Citations: [1], [2] footnotes + `### Source References` section
5. No HTML tags
