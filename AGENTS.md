# AGENTS

Project instructions for the Lexpertz Axiom Engine harness.

## Project Stack

- **Client:** Next.js 16 + React 19 + Tailwind + Clerk + framer-motion
- **Server:** Python FastAPI + LangChain/LangGraph + Supabase (PostgreSQL + pgvector)
- **Agent graph:** declarative `.md` skill tree at `axiom-skills/` driven by the generic Python engine at `server/app/engine/`

## Model Routing

All models authenticated via API. See `opencode auth list`.

| Slot | Model |
|------|-------|
| Primary (`model`) | `deepseek/deepseek-v4-flash` |
| Small (`small_model`) | `deepseek/deepseek-chat` |
| Subagent default | `deepseek/deepseek-chat` |
| Reviewers (code/security/python/database) | `nvidia/deepseek-ai/deepseek-v4-flash` |
| Docs | `opencode/nemotron-3.5-lightning-free` |
| Vision (image → spec) | `google/gemini-3.1-flash-lite` via `vision-interpreter` |

## Commands

`plan`, `tdd`, `code-review`, `security`, `build-fix`, `e2e`, `verify`,
`test-coverage`, `update-docs`, `checkpoint`, `refactor-clean`.

## Available Subagents

`planner`, `architect`, `code-reviewer`, `security-reviewer`, `tdd-guide`,
`build-error-resolver`, `e2e-runner`, `doc-updater`, `python-reviewer`,
`database-reviewer`, `vision-interpreter`, `harness-optimizer`.

## Context Navigation (graphify-first)

The repo carries a knowledge graph at `graphify-out/` (1812 nodes, 2745 edges,
180 communities). Use it instead of raw filesystem scanning:

| Step | Action |
|-----:|--------|
| 1 | Read `graphify-out/GRAPH_REPORT.md` at session start |
| 2 | `graphify query "<concept>"` for call paths / relations |
| 3 | `graphify explain <symbol>` for a single symbol |
| 4 | `graphify affected "<symbol>"` before refactoring |
| 5 | Open only the file the graph points to |
| 6 | `git grep` / `grep` as last-resort fallback |

Graph is rebuilt automatically by `post-commit` / `post-checkout` hooks;
manual rebuild: `graphify update . --code-only`.

## Coding Standards

- **Immutability:** create new objects, never mutate existing ones
- **Error handling:** handle errors at every level; never silently swallow
- **Input validation:** validate at system boundaries, fail fast
- **Testing:** TDD, 80%+ coverage; unit + integration + E2E
- **Commits:** conventional format (`feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`)

## Security

- No hardcoded secrets. API keys live in the GLOBAL opencode config only.
- Validate all inputs; parameterized SQL; sanitize HTML; CSRF protection.
- If a security issue is found: stop, review, fix CRITICAL first, rotate exposed secrets.
