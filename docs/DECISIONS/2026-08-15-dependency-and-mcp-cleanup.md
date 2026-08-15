# Decision: Remove MCP Subsystem and Dead Dependencies

**Date:** 2026-08-15
**Status:** Accepted
**Scope:** Server dependencies + legacy MCP integration layer

---

## Context

The SiaS product spec (local-first desktop auditing coworker) defines a single
user interaction path: **Tauri desktop UI → FastAPI sidecar (REST + SSE)**. The
codebase still carried a self-contained **MCP gateway** from the SaaS era that
exposed the agent circuit to external MCP clients, plus a set of dependency
pins with zero imports.

## Decision

1. **Remove the MCP subsystem entirely:**
   - `server/app/mcp/server.py` + `server/app/mcp/` (standalone FastMCP entry
     point, not wired into `main.py`)
   - `server/app/skills/github.py`, `server/app/skills/database.py` (Python
     wrappers used only by the MCP server)
   - `connector/` (Node.js MCP client)
2. **Trim dead dependencies** from `server/requirements.txt`:

| Removed | Reason |
|---------|--------|
| `mcp==1.27.0` | Only used by the deleted MCP server |
| `PyGithub==2.9.1` | Zero imports anywhere |
| `pdf2image==1.17.0` | Zero imports; docling-era, needs poppler binary |
| `pypdf==6.10.0` | Zero imports; MarkItDown covers PDF |
| `python-magic==0.4.27` | Zero imports in app code |
| `pycryptodome==3.23.0` | Zero imports; `python-jose[cryptography]` uses `cryptography` |
| `pydantic-settings==2.13.1` | Zero imports |
| `jsonpatch==1.33` | Zero direct imports (transitive via `langchain-core`) |
| `tenacity==9.1.4` | Zero direct imports (transitive via `openai`) |
| `langchain==1.2.15` | Not imported; only `langchain-core` + sub-providers used |
| `langchain-community==0.4.1` | Not imported |
| `langchain-experimental==0.4.1` | Not imported |
| `langchain-openai==1.1.12` | Not imported |

3. **CI fix:** `.github/workflows/root-integrity.yml` — dropped `connector`
   from the monorepo structure check.

## Rationale

- The SiaS product has no MCP interface; users interact through the desktop
  sidecar REST/SSE API only.
- Verified via import audit: `jsonpatch`/`tenacity` remain installed as
  transitive requirements of `langchain-core`/`openai` (not pinned directly).
- The engine (`app/engine/loader.py`) loads skills declaratively from `.md`
  files and never imports `app.skills.*`, so removal is safe.

## Consequences

- Fewer installed packages; faster venv setup; smaller Nuitka bundle.
- `pip check` clean; `app.main` and `markitdown` import cleanly.
- The old test suite (`tests/test_agents.py` etc.) still exercises the legacy
  SaaS architecture and is **not a gate for the refactor** — it will be
  rewritten alongside each phase toward the SiaS structure.
