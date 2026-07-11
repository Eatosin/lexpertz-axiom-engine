# Axiom Engine: Sovereign Auditing Intelligence

Axiom Engine is an **enterprise-grade evidence-gated auditing platform**. It cross-references
static PDFs, live databases, and GitHub code through a **multi-agent reasoning circuit** with
adversarial hallucination grading — catching contradictions and compliance gaps before they
reach a human reviewer.

---

## Architecture at a Glance

```
                    ┌─────────────────────────────────────────────┐
                    │              LangGraph Orchestrator          │
                    │                                             │
  User Query ──────►│  Librarian  →  Editor  →  Strategist        │
  (/axm -a -t)      │  (retrieve)   (distill)   (comparative)     │
                    │                    │                         │
                    │                    ▼                         │
                    │              Architect  ◄──── retry loop     │
                    │              (generate)       │              │
                    │                    │           │              │
                    │                    ▼           │              │
                    │              Prosecutor  ─────┘              │
                    │              (grade, 0.7/0.9 threshold)      │
                    └─────────────────────────────────────────────┘
```

Every agent node reads its **model, temperature, prompts, fail-safe strategy, and retry
thresholds** from a single `.md` file in `axiom-skills/`. The Python engine at
`server/app/engine/` contains **zero hardcoded model names, zero hardcoded prompt text,
zero hardcoded threshold values**. What changes is a human-readable YAML block; what stays
is one generic `execute_llm()` function.

---

## The Declarative Skill Tree

```
axiom-skills/
├── agents/                     Agent node configs
│   ├── librarian/SKILL.md     Hybrid search + reranking (retriever)
│   ├── editor/SKILL.md        Evidence → JSON brief (LLM + PydanticParser)
│   ├── strategist/SKILL.md    Multi-document comparison (LLM)
│   ├── architect/SKILL.md     Final audit report (LLM)
│   └── prosecutor/SKILL.md    Adversarial grading (LLM + thinking mode)
│
├── skills/                     Domain skills (pre-load content, skip retrieval)
│   ├── code-audit/SKILL.md    GitHub source vs. vault PDFs
│   └── dataset-audit/SKILL.md CSV/JSONB vs. vault PDFs
│
├── routing/                    Conditional edge definitions
│   ├── post-retrieval.md     After Librarian (evidence → distil|strategist|end)
│   └── post-grading.md       After Prosecutor (pass → end; fail → retry)
│
└── core/                       Shared prompt fragments
    ├── axiom-system.md       Architect system instruction
    └── citation-protocol.md  Citation formatting rules
```

### SKILL.md Format (declarative, human-readable)

Every skill directory holds a `SKILL.md` with **YAML frontmatter** (machine-parsed)
followed by a **Markdown body** (human documentation). Example (`agents/editor/SKILL.md`):

```yaml
---
name: editor
display_name: "Editor"
type: llm

model:
  provider: nvidia
  name: meta/llama-3.3-70b-instruct
  temperature: 0.0
  max_tokens: 2048
  response_format: json_object

structured_output:
  schema_name: DistilledContext
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
  system: prompts/system.md
  human: prompts/human.md
---
```

**Discovery** is via `glob **/SKILL.md` — zero registration overhead. New agent = new folder with
two files (`SKILL.md`, `prompts/system.md`). No Python changes, no import wiring, no registry
file.

---

## The Engine Loader

`server/app/engine/` — generic Python execution layer (6 modules, zero agent-specific code):

| Module | Role |
|--------|------|
| `models.py` | Pydantic validation: `SkillConfig`, `LLMConfig`, `FailSafeConfig`, `RoutingRule` |
| `loader.py` | `SkillLoader`: glob `SKILL.md` → parse YAML frontmatter → validate → map ↔ `SkillConfig` |
| `prompt_renderer.py` | `PromptRenderer`: `.md` prompt files → LangChain `ChatPromptTemplate` with brace-escaping |
| `skill_executor.py` | `SkillExecutor.execute_llm(skill_name, variables)` — generic node runner |
| `registry.py` | `SchemaRegistry`: maps schema names (e.g. `DistilledContext`) → Pydantic classes |
| `__init__.py` | Public API: `SkillLoader`, `PromptRenderer`, `SkillExecutor`, `SchemaRegistry`, Pydantic models |

### Node execution flow (agents → generic engine)

```python
# nodes.py — every node follows this pattern, never talks to an LLM directly

async def generate_node(state: AgentState):
    skill = executor.get_skill("architect")  # reads axiom-skills/agents/architect/SKILL.md
    result = await executor.execute_llm(
        skill_name="architect",
        variables={"question": state["question"], "context": evidence_text},
    )
    return {"generation": result["content"], "status": "verifying"}
```

`executor.execute_llm()` builds the model (`ChatNVIDIA` / `ChatGroq`) from the `.md`
frontmatter, renders prompts, attaches a `PydanticOutputParser` when the skill declares
`structured_output`, strips preambles, and applies the fail-safe strategy on exception.
**No node function knows what model it calls**, what temperature it dials, or how many
retries it tolerates.

---

## Agent Circuit (Hard Nodes)

Five nodes wired in LangGraph, each driven by its `SKILL.md`:

| Node | SKILL.md | What it does | Model |
|------|----------|-------------|-------|
| **Librarian** | `agents/librarian` | Hybrid search (vector + keyword) + Nemotron reranking | — |
| **Editor** | `agents/editor` | Raw chunks → structured JSON brief with `has_relevant_evidence` gate | Llama-3.3-70B (JSON mode) |
| **Strategist** | `agents/strategist` | Multi-document comparative matrix | Llama-3.3-70B |
| **Architect** | `agents/architect` | Final audit report with conversation history and formatting directives | Llama-3.3-70B |
| **Prosecutor** | `agents/prosecutor` | Adversarial grading — `faithfulness_score` + `is_hallucinating`, retry loop | DeepSeek-Terminus (thinking mode) |

### AXM-CLI Flags

Commands parsed by `/axm` regex in `retrieve_node()`:

| Flag | Effect | Active in node |
|------|--------|----------------|
| `-a` | Deep audit (60 chunks/top_k=20 instead of 30/12) | Librarian |
| `-c` | Comparative mode → routes to Strategist | route_post_retrieval |
| `-t` | Table mode — markdown data grids | Architect |
| `-v` | Intensified grading threshold (0.9 instead of 0.7) | Prosecutor |
| `..` | Suppress conversation history | Architect |

Flags are combinable. Example: `/axm -a -t Verify revenue growth for Q1 2025`

---

## API Surface (`server/app/api/`)

FastAPI running on port 7860, prefix-parked under `/api/v1`:

| Router | Prefix | Key endpoints |
|--------|--------|--------------|
| `run.router` | `/api/v1` | `POST /verify` — The sovereign audit endpoint (SSE-streamed agent trace) |
| `ingest.router` | `/api/v1` | `POST /upload`, `GET /status/{filename}`, `DELETE /documents/{filename}` |
| `history.router` | `/api/v1` | `GET /documents`, `GET /chat/{filename}` |
| `vault.router` | `/api/v1/vault` | `POST /search` — Hybrid semantic/keyword retrieval |
| `keys.router` | `/api/v1/keys` | `POST /`, `GET /`, `DELETE /{key_id}` — MCP token management |

CORS allows `localhost:3000`, `*.vercel.app`, and HuggingFace Spaces. All endpoints
surface SSE-compatible events with `step/total/duration` enrichment (streamed node-by-node
so the Next.js client renders a live agent dashboard).

---

## MCP Bridge (`server/app/mcp/server.py`)

Five sovereign tools exposed via MCP that any AI coding assistant can call:

| Tool | Function | Boundary |
|------|----------|----------|
| `run_axiom_audit` | Full agent graph execution on a query + filenames | Server-side SSE stream |
| `search_axiom_vault` | Hybrid semantic/keyword retrieval only (no LLM) | Supabase RLS |
| `audit_code_implementation` | GitHub source code vs. vault PDFs | `skip_retrieval=True` (pre-loaded documents) |
| `upload_csv_dataset` | Local CSV → encrypted JSONB vault | Supabase RLS |
| `audit_live_dataset` | Live SQL reconciliation against uploaded dataset | `skip_retrieval=True` |

Domain skills set `skip_retrieval: True` in `AgentState` so the Librarian node
short-circuits and preserves the pre-loaded documents (GitHub raw code / CSV rows)
without re-running expensive hybrid search.

---

## Security Protocols

The project ships dedicated `security-reviewer` and `security-review` skill agents
that gate all code changes at handoff:

- **No hardcoded secrets** — All keys read from `.env` (`NVIDIA_API_KEY`, `GROQ_API_KEY`,
  `GITHUB_TOKEN`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`). `.env` is git-ignored.
- **Row-Level Security** — All Supabase queries scoped to `state["user_id"]`.
- **Input validation** — `/axm` command parsing is regex-whitelisted (no eval, no shell injection).
- **GitHub token scoping** — `PyGithub` integration uses `repo` + `gist` scopes only (no org admin).
- **Fail-safe by default** — Every LLM node wraps its call in `try/except` with a
  defined fail-safe strategy (strip markers, return default pass, return empty evidence).
  **No infinite retry loops**: the Prosecutor skips grading on empty generation;
  the Editor short-circuits on empty context; the Librarian returns `no_evidence` on
  zero search results.
- **Zero unauthenticated endpoints** — `run.py`, `ingest.py`, and `vault.py` require
  JWKS-validated Cleric tokens. `keys.py` requires authenticated API-key scope.
- **LangSmith tamper-evidence** — Every agent node, retrieved document, and
  hallucination score is traced to a secure cloud telemetry system.

---

## Deployment Layout (Docker Compose)

```yaml
services:
  server:     # FastAPI on port 8000→7860, 4GB memory limit, healthcheck curl
  client:     # Next.js 16 + React 19 on port 3000, depends on server healthy
```

Stack summary:

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Client** | Next.js 16, React 19, Tailwind, Clerk, framer-motion | Dashboard + live agent trace SSE stream |
| **Server** | FastAPI, LangGraph, LangChain, NVIDIA NIM + Groq | Agent circuit, hybrid search, reranking |
| **Vector DB** | Supabase (PostgreSQL + pgvector) | 1024-dim chunk embeddings + RLS |
| **Telemetry** | LangSmith | Per-node trace + "Black Box" flight recorder |
| **Ingestion** | Docling + Tika + pdf2image | PDF → text + tables + embedded images |
| **MCP Bridge** | FastMCP + PyGithub | Local-code ↔ cloud-vault connector |

---

## Observability

- **SSE agent trace**: Every node transition (`Librarian → Editor → Architect → Prosecutor`)
  is streamed to the client with step/total/duration enrichment. The dashboard renders
  a live progress bar per agent.
- **LangSmith flight recorder**: Every LLM call, retrieved chunk, reranking score, and
  hallucination grade is recorded in secure cloud traces. Engineers can open the "Black
  Box" and replay every audit step deterministically.
- **Background ingestion**: Document uploads compute a live ETA. Users can enable push
  notifications and switch tabs; Axiom's background workers fire a browser notification
  when the document is ready.

---

## Development

### Prerequisites

- Python 3.14+, Node.js 22+, Supabase project
- NVIDIA API key (`nvapi-...`) and/or Groq API key (`gsk_...`)

### Quick start

```bash
# Server
cd server && pip install -r requirements.txt
$env:PYTHONIOENCODING='utf-8'; $env:PYTHONUTF8='1'; uvicorn app.main:app --reload --port 7860

# Client
cd client && npm install && npm run dev -- --port 3000

# Tests (111 collected, 91 passing skill-tree + 35 legacy)
$env:PYTHONIOENCODING='utf-8'; $env:PYTHONUTF8='1'; python -m pytest tests/ -v
```

### Add a new agent

1. Create `axiom-skills/agents/<name>/SKILL.md` (YAML frontmatter + Markdown body)
2. Create `axiom-skills/agents/<name>/prompts/system.md` and `human.md` (for LLM agents)
3. Register a Pydantic schema in `server/app/engine/registry.py` (if structured output)
4. Add a node function in `server/app/agents/nodes.py` that calls `executor.execute_llm("<name>", variables)`
5. Wire it into `server/app/agents/graph.py`
6. Reload. `SkillLoader.discover_skills()` picks up the new directory on next call.

---

## Test Coverage

| Suite | Count | Purpose |
|-------|-------|---------|
| `test_skill_loader.py` | 18 | SKILL.md discovery, parsing, validation, duplicate detection |
| `test_prompt_renderer.py` | 8 | Brace escaping, format_instructions injection |
| `test_skill_executor.py` | 15 | Schema registry, LLM building, preamble stripping, fail-safe |
| `test_nodes_skill_driven.py` | 12 | All 5 nodes driven by `.md` config (happy path, fail-safe, intensify) |
| `test_retrieve_node_skip.py` | 3 | `skip_retrieval` preserves pre-loaded documents |
| Legacy (35) | 35 | Chunking(10), monitor(4), prompts(10), auth(7), agents(4) |
| **Total** | **91** | All pass |

Coverage: `pytest --cov=server/app --cov=server/app/engine`

---

**Axiom Engine: Standard AI guesses. Axiom proves.**