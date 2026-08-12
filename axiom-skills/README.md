# Axiom Skill Tree

Declarative skill definitions that drive the Axiom agent graph. Every agent
node, prompt, threshold, and routing rule lives in this directory as
`.md` files with YAML frontmatter.

The Python engine at `server/app/engine/` reads this tree and executes
nodes based on the configuration declared here. **Python contains only
*behavior* — every *what* and *why* lives in this Markdown tree.**

## Directory Layout

```
axiom-skills/
├── agents/                  # Agent node definitions (Librarian, Editor, ...)
│   ├── librarian/           # Retrieval + reranking
│   ├── editor/              # Evidence distillation (JSON output)
│   ├── strategist/          # Multi-document comparative audit
│   ├── architect/           # Final verified audit report
│   └── prosecutor/          # Hallucination grading (DeepSeek)
│
├── skills/                  # Top-level domain skills
│   ├── code-audit/          # GitHub source-code vs. vault PDFs
│   └── dataset-audit/       # CSV/JSONB dataset vs. vault PDFs
│
├── routing/                 # Conditional edge definitions
│   ├── post-retrieval.md    # After Librarian
│   └── post-grading.md      # After Prosecutor
│
├── core/                    # Shared prompt fragments
│   ├── axiom-system.md      # AXIOM_SYSTEM_INSTRUCTION (used by Architect)
│   └── citation-protocol.md # Citation format rules
│
└── prompts/                 # (skill-specific .md per skill)
```

## SKILL.md File Format

Every skill directory contains a `SKILL.md` with YAML frontmatter + a
markdown body. The frontmatter is parsed by `app/engine/loader.py`,
validated by `app/engine/models.py`, and consumed by `app/engine/skill_executor.py`.

Example (`axiom-skills/agents/editor/SKILL.md`):

```yaml
---
name: editor
display_name: "Editor"
description: "Distills retrieved evidence into structured JSON briefs"
type: llm

model:
  provider: nvidia
  name: meta/llama-3.3-70b-instruct
  temperature: 0.0
  top_p: 0.95
  max_tokens: 2048
  response_format: json_object

structured_output:
  schema_name: DistilledContext       # Pydantic class registered in Pydantic registry
  parser: PydanticOutputParser

config:
  preambles_to_strip:
    - "Here is the synthesized evidence brief:"
    - "Based on the provided snippets:"
  empty_context_response: "NO RELEVANT EVIDENCE"

fail_safe:
  strategy: strip_exhibit_markers
  max_length: 6000

prompts:
  system: prompts/system.md             # Relative to this SKILL.md
  human: prompts/human.md
---

# Editor Agent

The Editor distills raw RAG snippets into structured JSON briefs...

## Purpose

1. Clean noise from retrieval chunks.
2. Preserve exhibit markers verbatim.
3. Gate downstream generation on `has_relevant_evidence`.

## Schematic

[... human-readable documentation continues ...]
```

## How to Add a New Skill

1. Create a new directory under `axiom-skills/agents/_extraname_/` or `axiom-skills/skills/_name_/`.
2. Write `SKILL.md` with the required YAML frontmatter (use one of the existing skills as a template).
3. Add prompt files at `prompts/system.md` and `prompts/human.md` (for LLM-type skills).
4. Add a Pydantic class registration in `server/app/engine/registry.py` if the skill uses structured output.
5. Reload the engine — `SkillLoader` discovers the new file on next call.
6. Optionally: add a node function in `server/app/agents/nodes.py` that calls `executor.execute_llm("skill_name", variables)`.

## Validation

```python
from app.engine import SkillLoader
loader = SkillLoader()
errors = loader.validate_all()
print(errors)  # [] when all SKILL.md files are well-formed
```

## Why Markdown?

| Benefit | Description |
|---------|-------------|
| **Human-readable** | Prompts, thresholds, and routing rules can be reviewed without reading Python. |
| **Version-controlled** | Each skill is its own file with its own git history. |
| **Discoverable** | `tree axiom-skills/` is documentation. |
| **Modular** | Adding or removing an agent = adding or removing a directory. No code changes. |
| **Validated** | Pydantic parsed YAML frontmatter enforces type safety at load time. |
| **Aligned with ECC** | Same convention as `.agents/skills/` in the ECC framework. |

## Boundary: Where Python Stops

The `.md` files declare **what** — the configuration and the human
intent. Python still owns:

| Pattern | Why |
|---------|-----|
| `/axm` command regex parsing | Stateful syntax, multiple flag combinations |
| Hybrid search orchestration | Async I/O, retry logic |
| Conversation history injection | Last-3-turn window, `..` reset |
| Edge-case fail-safe execution | `monitor.guard_context`, exception handling |
| LangGraph wiring | API-driven orchestration layer |
| Structured output enforcement | Pydantic runtime validation |
| Routing condition evaluation | `route_post_retrieval`, `route_post_grading` |
