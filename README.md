# Axiom Engine — SiaS Local-First Auditing Coworker

Axiom Engine is a **SiaS (Software-in-a-Service) desktop auditing coworker**: a
local-first app where your documents never leave your machine. It cross-references
uploaded audit documents through a **multi-agent reasoning circuit** with adversarial
hallucination grading — catching contradictions and compliance gaps before they reach a
human reviewer.

**Privacy promise:** *Your data never leaves your machine without your key.*

- **Local-Data**: parsing, chunking, vector search, chat history, and telemetry all run
  on-device against per-client SQLite vaults.
- **Bring Your Own Models (BYOK)**: all inference uses keys you supply (NVIDIA, OpenAI,
  DeepSeek, Groq) or local models. Axiom never hosts, relays, or bills models.
  See `docs/DECISIONS/2026-08-16-model-policy-byok.md`.
- **Zero cloud dependency for core functionality** — the app works fully offline.

---

## Architecture at a Glance

```
┌──────────────────────────────────────────────────────────────┐
│  Tauri Desktop Shell (Phase 4)  — IPC, no HTTP ports exposed  │
├──────────────────────────────────────────────────────────────┤
│              FastAPI Sidecar (Nuitka, Phase 3)                │
│                                                              │
│  Upload ──► MarkItDown parser ──► chunker ──► embedder       │
│                   (local, MIT)                 │              │
│                                                ▼              │
│  SQLite Multi-Vault  ── vec0 KNN + FTS5 hybrid search        │
│  (vaults/client_<slug>.db, one file per engagement)           │
│                                                              │
│  LangGraph Orchestrator (declarative, unchanged)             │
│  Librarian → Editor → Strategist → Architect → Prosecutor    │
│                     ◄──── retry loop ────┘                   │
└──────────────────────────────────────────────────────────────┘
```

Every agent node reads its **model, temperature, prompts, fail-safe strategy, and retry
thresholds** from a single `.md` file in `axiom-skills/`. The Python engine at
`server/app/engine/` contains **zero hardcoded model names, zero hardcoded prompt text,
zero hardcoded threshold values**. What changes is a human-readable YAML block; what stays
is one generic `execute_llm()` function.

## Key Architecture Decisions

All decisions are recorded ADR-style in `docs/DECISIONS/`:

| Decision | Record |
|----------|--------|
| Local-only parsing via **MarkItDown (MIT)** — no cloud OCR, no AGPL | `2026-08-15-parser-local-only.md` |
| **Model policy**: BYOK + software subscription, structurally out of the data path | `2026-08-16-model-policy-byok.md` |
| **SQLite multi-vault** with vec0 vector search — per-client `.db`, no shared state | `2026-08-16-sqlite-multi-vault.md` |
| MCP subsystem + 13 dead dependencies removed | `2026-08-15-dependency-and-mcp-cleanup.md` |

---

## Repository Layout

```
server/                    FastAPI sidecar (Python 3.14)
  app/core/                ports, config, axiom_paths, adapters, parsers, vault_backup
  app/api/                 ingest, run, vault, history, keys (all SQLite-backed)
  app/engine/              generic declarative skill engine (unchanged)
  app/agents/              LangGraph circuit (unchanged)
  requirements.txt         pinned, verified on cp314 win/linux wheels
client/                    Next.js 16 + React 19 (dashboard; Tauri shell in Phase 4)
axiom-skills/              declarative skill tree (YAML frontmatter + Markdown)
docs/DECISIONS/            ADR-style decision records
docs/archive/PRD_SIAS.md   SiaS blueprint (phase plan)
tests/                     186 tests: unit + contract + integration (all local, no network)
```

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

**Discovery** is via `glob **/SKILL.md` — zero registration overhead. New agent = new folder with
two files (`SKILL.md`, `prompts/system.md`). No Python changes, no import wiring.

## The Engine Loader

`server/app/engine/` — generic Python execution layer (zero agent-specific code):

| Module | Role |
|--------|------|
| `models.py` | Pydantic validation: `SkillConfig`, `LLMConfig`, `FailSafeConfig`, `RoutingRule` |
| `loader.py` | `SkillLoader`: glob `SKILL.md` → parse YAML frontmatter → validate → `SkillConfig` |
| `prompt_renderer.py` | `PromptRenderer`: `.md` prompt files → LangChain `ChatPromptTemplate` |
| `skill_executor.py` | `SkillExecutor.execute_llm(skill_name, variables)` — generic node runner |
| `registry.py` | `SchemaRegistry`: schema names → Pydantic classes |

`executor.execute_llm()` builds the model from the `.md` frontmatter (`provider` +
`name` resolved from user `SiaSConfig`), renders prompts, attaches a
`PydanticOutputParser` when declared, and applies the fail-safe strategy on exception.
**No node function knows what model it calls.**

## Agent Circuit

Five nodes wired in LangGraph, each driven by its `SKILL.md`:

| Node | SKILL.md | What it does |
|------|----------|-------------|
| **Librarian** | `agents/librarian` | Hybrid search (vec0 vector + FTS5 keyword) + Nemotron reranking |
| **Editor** | `agents/editor` | Raw chunks → structured JSON brief with `has_relevant_evidence` gate |
| **Strategist** | `agents/strategist` | Multi-document comparative matrix |
| **Architect** | `agents/architect` | Final audit report with conversation history and formatting directives |
| **Prosecutor** | `agents/prosecutor` | Adversarial grading — `faithfulness_score` + `is_hallucinating`, retry loop |

### AXM-CLI Flags

| Flag | Effect | Active in node |
|------|--------|----------------|
| `-a` | Deep audit (60 chunks/top_k=20 instead of 30/12) | Librarian |
| `-c` | Comparative mode → routes to Strategist | route_post_retrieval |
| `-t` | Table mode — markdown data grids | Architect |
| `-v` | Intensified grading threshold (0.9 instead of 0.7) | Prosecutor |
| `..` | Suppress conversation history | Architect |

Flags are combinable. Example: `/axm -a -t Verify revenue growth for Q1 2025`

---

## Storage: SQLite Multi-Vault

- One `.db` file per audit client: `<axiom_home>/vaults/client_<slug>.db`
  (Windows: `%APPDATA%/AxiomEngine`, Linux/macOS: `~/.axiom-engine`)
- **Isolation by construction** — no shared tables, no `vault_id` columns, zero
  cross-engagement leakage
- **vec0** (sqlite-vec) KNN vector search over two dimension tables
  (`chunks_nv1024` for cloud embeddings, `chunks_local384` for local MiniLM)
- **FTS5** keyword search merged with vector results (hybrid ranking, keyword boost)
- WAL journal mode; backup/restore via the `sqlite3` backup API (`vault_backup.py`)
- `SiaSConfig.vault_type` selects the backend (`"sqlite"` default; `"supabase"`
  kept only for the migration window)

## API Surface (`server/app/api/`)

| Router | Prefix | Key endpoints |
|--------|--------|--------------|
| `run.router` | `/api/v1` | `POST /verify` — the sovereign audit endpoint (SSE-streamed agent trace) |
| `ingest.router` | `/api/v1` | `POST /upload`, `GET /status/{filename}`, `DELETE /documents/{filename}`, `GET /telemetry` |
| `history.router` | `/api/v1` | `GET /documents`, `GET /chat/{filename}` |
| `vault.router` | `/api/v1/vault` | `POST /search` — hybrid semantic/keyword retrieval |
| `keys.router` | `/api/v1/keys` | `POST /`, `GET /`, `DELETE /{key_id}` — hash-only API keys |

---

## Security

- **Local-first by construction**: documents, embeddings, and chat history never leave
  the machine; per-client vault files; no cloud storage of audit data
- **BYOK model policy**: we are structurally out of the data path — no gateway, no
  proxy, no token custody (`docs/DECISIONS/2026-08-16-model-policy-byok.md`)
- **No hardcoded secrets** — keys come from `.env` (`NVIDIA_API_KEY`, `GROQ_API_KEY`),
  git-ignored; BYOK keys move to the Tauri secure store in Phase 5
- **Hash-only API keys** — raw keys returned once, SHA-256 hashes stored
- **Input validation** — `/axm` regex-whitelisted; vault slugs restricted to
  `[a-z0-9_-]` (no path traversal); upload extension gate; bounded query limits
- **Fail-safe by default** — every LLM node wraps its call with a defined fail-safe
  strategy; no infinite retry loops
- **WAL-safe backups** — `vault_backup.py` uses `Connection.backup()`, never raw copy

---

## Development

### Prerequisites

- **Python 3.14** (pyenv recommended on Linux)
- BYOK model key(s): NVIDIA (`nvapi-...`) and/or Groq (`gsk_...`) — optional for
  development; tests run fully mocked/offline

### Linux Mint / Ubuntu

```bash
# 1. Python 3.14 via pyenv (Mint 22 ships 3.12 — repo pins target 3.14)
sudo apt install -y build-essential libssl-dev zlib1g-dev \
  libbz2-dev libreadline-dev libsqlite3-dev libffi-dev libncursesw5-dev
curl https://pyenv.run | bash
pyenv install 3.14
pyenv local 3.14

# 2. Server
cd server
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add your BYOK keys

# 3. Tests (all local, no network)
PYTHONPATH=server pytest tests/ -q
```

### Windows

```powershell
cd server
py -3.14 -m venv .venv; .\.venv\Scripts\activate
pip install -r requirements.txt
Copy-Item .env.example .env
$env:PYTHONPATH="server"; python -m pytest tests/ -q
```

### Run the API

```bash
# Server
PYTHONPATH=server uvicorn app.main:app --reload --port 8000

# Client (dashboard)
cd client && npm install && npm run dev -- --port 3000
```

### Add a new agent

1. Create `axiom-skills/agents/<name>/SKILL.md` (YAML frontmatter + Markdown body)
2. Create `axiom-skills/agents/<name>/prompts/system.md` and `human.md`
3. Register a Pydantic schema in `server/app/engine/registry.py` (if structured output)
4. Add a node function in `server/app/agents/nodes.py` calling `executor.execute_llm("<name>", variables)`
5. Wire it into `server/app/agents/graph.py`

---

## Test Suite (186 tests, 0 network calls)

| Suite | Purpose |
|-------|---------|
| `test_skill_loader.py` / `test_prompt_renderer.py` / `test_skill_executor.py` | Declarative engine: discovery, parsing, validation, fail-safe |
| `test_nodes_skill_driven.py` / `test_retrieve_node_skip.py` | LangGraph nodes driven by `.md` config |
| `test_chunking.py` | Chunker unit tests |
| `test_axiom_paths.py` / `test_config.py` | Dynamic paths + SiaSConfig (incl. BYOK fields) |
| `test_vault_port.py` / `test_sqlite_adapter.py` / `test_vector_store.py` | VaultPort contract, SQLite adapter, vec0/FTS5 hybrid search |
| `test_vault_backup.py` | WAL-safe backup/restore |
| `test_adapter_factory.py` | `get_vault()` backend selection |
| `test_parsers.py` | MarkItDown parser registry |
| `test_api_integration.py` | End-to-end: upload → index → hybrid search → verify (SSE) → chat → keys |

Coverage: `PYTHONPATH=server pytest --cov=server/app tests/`

---

## Roadmap (per `docs/archive/PRD_SIAS.md`)

| Phase | Scope | Status |
|-------|-------|--------|
| 0 | Dynamic paths, config, VaultPort seam, parser | **Shipped** |
| 1 | SQLite multi-vault, vec0 hybrid search, endpoint migration, backup | **Shipped** |
| 2 | Local embeddings (MiniLM ONNX) + AdaptiveEmbedder, BYOK provider enum | Next |
| 3 | FastAPI sidecar compilation (Nuitka) | — |
| 4 | Tauri desktop shell + static client export | — |
| 5 | OAuth device activation, license lockdown, secure-store keys | — |
| 6 | Excel/CSV parser pipeline | — |
| 7–8 | Client adaptation, E2E verification | — |

---

**Axiom Engine: Standard AI guesses. Axiom proves.**
