# Project Memory

## Architecture
- Client: Next.js 16 + React 19 + Tailwind + Clerk + framer-motion
- Server: Python FastAPI + LangChain/LangGraph + Supabase (PostgreSQL + pgvector)
- AI: DeepSeek API (primary + small) + NVIDIA NIM (reviewers) + Google Gemini (vision only)
- Agent graph: declarative `.md` skill tree at `axiom-skills/` driven by generic Python engine at `server/app/engine/`
- Knowledge graph: 1812 nodes / 2745 edges / 180 communities at `graphify-out/`

## OpenCode Harness
- Primary model: `deepseek/deepseek-v4-flash`
- Small model: `deepseek/deepseek-chat`
- Subagent default: `deepseek/deepseek-chat`
- Reviewer subagents: `nvidia/deepseek-ai/deepseek-v4-flash`
- Docs subagent: `opencode/nemotron-3.5-lightning-free`
- Vision model: `google/gemini-3.1-flash-lite` (via `vision-interpreter` subagent)
- Server: Python 3.14.6, Windows, 4GB RAM boundary
- Local config: `.opencode/opencode.json` (project overrides)
- Global config: `~/.config/opencode/opencode.json` (user presets)

## Global MCP Servers (active, 2 total)
| Name | Transport | URL / Command | Timeout |
|------|-----------|---------------|---------|
| `headroom` | local | `headroom.EXE mcp serve` on :8787 | 60000 |
| `context7` | remote | `https://mcp.context7.com/mcp` | 60000 |

Removed (2026-08-12 lean rebuild): `serena` (code intel), `@21st-dev/magic` (UI).

## OpenCode Plugins (active, 2 total)
| Plugin | Type | Purpose |
|--------|------|---------|
| `superpowers@git+...` | remote git | Process skills (brainstorming, debugging, TDD, etc.) |
| `opencode-supabase` | npm (v0.5.0) | Supabase Management API tools, `/supabase` command, bundled skills, MCP setup wizard |

Auto-discovered from `.opencode/plugins/`: `graphify.js` (bash reminder).
Custom tools auto-discovered from `.opencode/tools/` (8): run-tests, check-coverage,
format-code, lint-check, git-summary, security-audit, changed-files, dependency-analyzer.

Removed (round 1 cleanup): `obsidian-memory`, `obsidian-second-brain`.
Removed (2026-08-12 lean rebuild): `./plugins` ecc-hooks, `.opencode/plugins/orchestrator`.

## Skills installed under `.agents/skills/`
12 project-relevant skills (pruned 2026-08-12 from 63):
- `tdd-workflow`, `coding-standards` — baseline quality gates
- `security-review` — vulnerabilities + secrets
- `error-handling` — typed errors, retries, circuit breakers
- `frontend-patterns`, `react-patterns`, `react-testing`, `nextjs-turbopack` — client stack
- `fastapi-patterns`, `python-patterns`, `api-design` — server stack
- `database-migrations` — schema changes

Root `skills/` (277-skill ECC dump) deleted 2026-08-12; skills now load from `.agents/skills/` only.

## Graphify Integration
- Knowledge graph auto-rebuilt on `post-commit` and `post-checkout` git hooks
- Token reduction: 41.1x (120,800 naive → 2,942 token avg query)
- OpenCode plugin: `.opencode/plugins/graphify.js` — auto-injects `graphify query` reminder before bash calls
- Obsidian mirror: opt-in via `GRAPHIFY_EXPORT_DIR` env var, post-commit hook honors it
- Obsidian namespace convention: `<vault-root>/codebases/<product-slug>/`

## Key Decisions
- Model IDs use `deepseek/` for DeepSeek API models, `nvidia/<org>/<model>` for NVIDIA NIM
- Markdown-as-config: `.md` files declare *what*, Python owns *behavior*
- Skill discovery via `glob **/SKILL.md` — zero registry
- Vision tasks MUST route through `vision-interpreter` (never DeepSeek)
- API keys live in GLOBAL config, never project `.env` or local `.opencode/`
- Graphify reads `GRAPH_REPORT.md` first; quest→`query`, mutation→`affected`
- Two-layer config: global config preserves user prefs across projects; local config adds project overrides
- Mistake pattern: ctx7 already wrote full Context7 rule to global AGENTS.md → don't duplicate in INSTRUCTIONS.md (token bloat)

## External Integrations
- `gh` CLI v2.96.0 — user `Eatosin` on github.com, scopes: `gist`, `read:org`, `repo`, `workflow`
- `graphify` CLI v0.9.12 — `C:\Users\HomePC\AppData\Roaming\Python\Python314\Scripts\graphify.exe`
- `@21st-dev/cli` v1.6.0 — installed, but `@21st-dev/magic` MCP removed 2026-08-12 (lean rebuild)

## Discovered Skills Log
| Date | Skill | Query | Path | Applied |
|------|-------|-------|------|---------|
| 2026-07-10 | design-engineering | "21st.dev component workflow" | .agents/skills/design-engineering/SKILL.md | yes |

## Current Session (2026-08-15) — SiaS Sprint 1: Parser + Phase 0 Foundation
- **Mission 7: SiaS architecture kickoff — parser decision + Phase 0 (2026-08-15)**
  - **Architecture pivot context**: `docs/archive/PRD_SIAS.md` = SiaS (Software-in-a-Service) local-first desktop auditing coworker — Tauri + FastAPI sidecar (Nuitka) + SQLite multi-vault; "Cloud-Brain, Local-Data"
  - **Decision records** (new `docs/DECISIONS/` convention, ADR-style):
    - `2026-08-15-parser-local-only.md` — PDF parsing = **Microsoft MarkItDown (MIT)**, local-only, no cloud OCR; amended after AGPL audit (see below)
    - `2026-08-15-dependency-and-mcp-cleanup.md` — removed MCP subsystem + 13 dead deps
  - **Parser research trail**: Docling (~2.5-3.5GB torch / ~400-600MB ONNX) → PyMuPDF4LLM (AGPL!) → **MarkItDown 0.1.7 (MIT)** — built on pdfminer.six + pdfplumber, headings + Markdown tables handled, ~40-60MB, fully offline, no model weights
  - **License finding**: PyMuPDF/pymupdf4llm/pymupdf-layout are **AGPL-3.0** dual-licensed (Artifex) — rejected for closed-source distribution
  - **Unlimited-OCR (baidu, 23.8k⭐) evaluated**: GPU-only VLM (CUDA/vLLM/SGLang) — server-grade only, not for local sidecar; kept as future cloud "precision parser" candidate only
  - **Stale docs removed**: `21st-dev-magic-integration.md`, `C3_VERIFICATION.md`, `designs/2026-07-14-mcp-orchestrator-design.md` (dead integrations)
  - **Dependency cleanup (−13 direct pins)**: removed `mcp, PyGithub, pdf2image, pypdf, python-magic, pycryptodome, pydantic-settings, jsonpatch, tenacity, langchain, langchain-community, langchain-experimental, langchain-openai` (all zero-import); `jsonpatch`/`tenacity` stay as transitive via `langchain-core`
  - **MCP subsystem deleted**: `server/app/mcp/`, `skills/github.py`, `skills/database.py`, `connector/` (Node MCP client); CI `root-integrity.yml` connector check dropped
  - **Supabase version fix**: `supabase==2.28.3` → `2.31.0` — storage3 ≥2.31 moved `pyiceberg` to optional `[iceberg]` extra (pyiceberg has NO cp314 wheel → source build → Rust → failure)
  - **Build**: `server/.venv` (Python 3.14) — full pinned set installs clean, `pip check` OK
  - **Phase 0 shipped (TDD, 25 new tests green)**:
    - `server/app/core/axiom_paths.py` — `%APPDATA%/AxiomEngine` (win) / `~/.axiom-engine` (nix); dirs created on access
    - `server/app/core/ports.py` — `VaultPort` + `EmbeddingPort` Protocols (runtime_checkable)
    - `server/app/core/config.py` — `SiaSConfig` (JSON load/persist, thread-safe, DEFAULTS)
    - `server/app/core/adapters/supabase_adapter.py` — VaultPort over existing Supabase (create_vault/list_vaults = no-op, SQLite multi-vault is Phase 1)
    - `server/app/core/parsers/__init__.py` + `pdf_parser.py` — registry + MarkItDown (plugins disabled)
    - `server/app/api/ingest.py` — `TEMP_DIR=/tmp/axiom_ingest` → `axiom_paths.get_temp_dir()`; Docling `DocumentConverter` → `dispatch_parser()`; upload gate `.pdf/.xlsx/.csv/.xls`
    - Fixture: `tests/fixtures/sample_audit.pdf` (reportlab-generated, headings + 3-row table) — MarkItDown output verified: proper `|` tables + structure
  - **Legacy test suite deleted (2026-08-16)**: `test_agents`, `test_api`, `test_core`, `test_monitor`, `test_auth` (SaaS-era: LLM circuits, SSE endpoints, token counter, ContextMonitor, Clerk/Supabase auth) removed — all 7 known failures gone with them. Remaining suite = Phase 0/parser/BYOK-config tests + declarative engine tests (skill_loader, skill_executor, nodes_skill_driven, prompt_renderer, prompts, retrieve_node_skip, chunking — engine survives unchanged per PRD). 110 passed, 0 failed.
  - **Commits**: `chore(server): remove MCP subsystem and dead dependencies` · `feat(server): Phase 0 foundation` · `feat(server): local-first MarkItDown parser` · `docs(memory): record SiaS Sprint 1` · `docs(decisions): model policy — BYOK` · `feat(core): BYOK config fields + RLock fix` · `test: delete legacy SaaS-era suite` · `feat(server): SQLite multi-vault adapter with vec0 search` · `docs(decisions): SQLite multi-vault`
  - **Phase 1a shipped (2026-08-16, TDD, 37 new tests)**: `sqlite-vec==0.1.9` verified on cp314 win_amd64 (`py3-none-*` wheel = any CPython 3, unlike pyiceberg — earlier fear was wrong); `sqlite_schema.py` (per-client `.db`, no `vault_id` columns, WAL, two vec0 tables `chunks_nv1024`/`chunks_local384`), `vector_store.py` (`Vec0Store`: normalize → KNN, dim routing 384/1024), `sqlite_adapter.py` (all 9 VaultPort methods, `asyncio.to_thread` + RLock, slug regex validation), `adapters/__init__.py` (`get_vault()` factory, `vault_type` default sqlite); contract tests + isolation + concurrency + factory tests. ADR: `docs/DECISIONS/2026-08-16-sqlite-multi-vault.md`
  - **Next (Phase 2)**: local embeddings (onnxruntime 1.28 cp314 wheel verified) — MiniLM 384-d + AdaptiveEmbedder cloud-BYOK fallback; then Phase 3 sidecar compilation (Nuitka)
  - **Phase 1b shipped (2026-08-16, TDD, 76 new tests)**: `VaultPort` extended with 11 API-layer methods (list_documents, get_document_by_filename, update_document_status, set_document_permanent, delete_document, search_vault hybrid vec0+FTS5, store/list_audit_logs, create/list/revoke_api_key); FTS5 `chunks_fts` table (offset-encoded rowids, porter tokenizer); all 5 endpoints + retriever + main.py migrated to `get_vault()` — zero `core.database` imports left in API layer (auth.py stays, Phase 5 scope); `nest_asyncio.apply()` removed from main.py (broke TestClient portal); `vault_backup.py` backup/restore via `sqlite3.backup()` (WAL-safe, slug validation); integration tests (TestClient + mocked embeddings + overridden auth) cover upload→index→search→verify→chat→telemetry→keys flows. **Phase 1 COMPLETE** — 186 passed, 0 failed

- **Mission 1: Graphify + Context7 cleanup**
  - Removed `obsidian-memory`, `obsidian-second-brain` from global config
  - `pip install graphifyy` (0.9.12) → `graphify install --platform opencode` (not `graphify opencode install`)
  - Initial graph: `graphify . --code-only --no-label --no-viz --max-concurrency=1` — 1812 nodes, 2745 edges, 180 communities
  - Graphify CLAUDE.md rules appended to both AGENTS.md and INSTRUCTIONS.md
- **Mission 2: Serena diagnostic + Obsidian namespace isolation + README refactor**
  - Serena 29 tools active, 5s startup, timeout already 120s (no config change needed)
  - Created `C:\Users\HomePC\Documents\Obsidian\my-brain\codebases\lexpertz-axiom-engine/`
  - 1977 loose graphify .md moved; 1992 notes + 495 KB canvas re-exported to namespace
  - Added `GRAPHIFY_EXPORT_DIR` opt-in mirror to `post-commit` + `post-checkout` hooks
  - README.md refactored to declarative-architecture format (13.7 KB, 11 sections)
  - Convention doc: `.opencode/OBSIDIAN_NAMESPACE.md`
- **Mission 3: Context7 MCP reinstall**
  - Deleted stale `.agents/skills/{context7-cli,context7-mcp,find-skills}/`
  - Pruned `skills-lock.json` (truncated to `{"version":1,"skills":{}}`)
  - `npx ctx7 setup --opencode --mcp` → OAuth flow → API key `ctx7sk-3a232684-...`
  - Global `AGENTS.md` auto-populated with 4-step Context7 protocol
- **Mission 4: 21st.dev Magic MCP**
  - `npx @21st-dev/cli@latest login` → user authenticated (token at `~/.config/21st/auth.json`)
  - API key `21st_sk_e9094d0514fc5f2c78256bfefe1e020a586fe0dab7fa36c65146083b60757a47`
  - Registered `@21st-dev/magic` as remote MCP in global config
  - Created `.agents/skills/design-engineering/` (SKILL + 2 prompts)
  - Appended 5-rule Design Engineering Pipeline to AGENTS.md
  - Smoke test: search "navbar" → 4 components ✓; search "pricing-card" → id 8282 ✓
- **Mission 5: Client Refactor Blueprint + TDD Implementation (2026-07-11)**
  - PRD_CLIENT.md written to `.opencode/plans/PRD_CLIENT.md` (307 lines, 10 sections)
  - Vitest test infrastructure added: `vitest.config.ts`, `src/test-setup.ts`, scripts (`test`, `test:watch`, `test:coverage`)
  - Test deps: `vitest@4.1.10`, `jsdom@29.1.1`, `@testing-library/react@16.3.2`, `@testing-library/jest-dom@6.9.1`, `@vitejs/plugin-react@6.0.3`, `@vitest/coverage-v8`
  - **Test suite (RED → GREEN)**: 22 tests passing in 3 files
    - `src/lib/__tests__/api.test.ts` (10 tests) — SSE event parser, multi-line, invalid-JSON fallback
    - `src/hooks/__tests__/use-audit-stream.test.ts` (11 tests) — `/axm` flag parser: `-a -t -v -h -c` + `..` reset
    - `src/components/workspace/__tests__/strategist-arena.test.ts` (1 test) — clerk/react-query mocks
  - **api.ts refactored**: `parseSseEvent()` exported with `SseEventType` enum + Zod schemas per event
  - **useAuditStream.ts refactored**: typed SSE parsing, `parseAxmFlags()` exported, `comparison_map` injected for multi-doc, `fetchWithBackoff()` with exponential backoff (1s→2s→4s→8s cap), `historyHydrated` lifecycle, `primaryFilename` prop, hydration moved into hook
  - **StrategistArena**: rewrote as redirect shim (was passing `token: null`, violating rules-of-hooks with conditional `useAuditStream` call inside callback)
  - **`/dashboard/compare`**: rewritten to redirect to `/dashboard` with `contexts` from sessionStorage
  - **VerificationDashboard**: removed duplicate hydration `useEffect`; consumes `historyHydrated` from hook
- **Phase C1–C2 (status)**: API alignment ✓ | SSE contract ✓ | Strategist bug ✓ | Compare merge ✓ | History hydration ✓ | AbortController ✓ | Retry ✓
- **Phase C3–C4 (deferred)**: 21st.dev component install + component E2E tests blocked by Windows x64 native bindings (Turbopack fails, build via webpack fails too — environment issue, not code)
- **Mission 6: Lean harness rebuild (2026-08-12)**
  - **Models**: primary `deepseek/deepseek-v4-flash`, small `deepseek/deepseek-chat`, subagent default `deepseek/deepseek-chat`, reviewers `nvidia/deepseek-ai/deepseek-v4-flash`, docs `opencode/nemotron-3.5-lightning-free`, vision `google/gemini-3.1-flash-lite`
  - **Agents 41 → 13**: dropped all non-project-language reviewers/resolvers (go/cpp/java/kotlin/php/rust), loop-operator, refactor-cleaner, docs-lookup
  - **Commands 41 → 11**: dropped instinct-*, go-*, rust-*, evolve/promote/projects/skill-create/setup-pm/learn/orchestrate/loop-*/model-route/quality-gate/harness-audit
  - **Instructions 25 → 4**: force-loaded skill files cut to just `tdd-workflow` (token bloat fix)
  - **Plugins**: deleted ecc-hooks.ts (599 lines), orchestrator/, lib/, index.ts — auto-discovery only (graphify.js + tools). Removed explicit `./plugins` + orchestrator entries from config (were double-loading)
  - **Tools**: deleted `.opencode/tools/index.ts` (was creating `index_*` duplicate tools); `changed-files.ts` rewritten git-based (no in-memory store dependency)
  - **Skills**: root `skills/` (277) deleted; `.agents/skills/` pruned 63 → 12
  - **Global config**: removed serena + @21st-dev/magic MCPs, deleted `provider.headroom` block (fake claude/gpt model names); kept mcp.headroom + mcp.context7
  - **Docs**: AGENTS.md 466 → ~50 lines; INSTRUCTIONS.md deduplicated; MEMORY.md updated; designs + PRD_SIAS archived to `docs/archive/`
  - `.opencode/` ECC packaging cruft deleted (package.json, tsconfig, README, MIGRATION, index.ts)

## Mistake Patterns
- **`uv` not on PATH** — must use `pip` or full pip path; documented in earlier sessions
- **PowerShell execution policy blocks `npx.ps1`** — wrap with `cmd /c "..."`
- **Interactive CLIs (ctx7/21st setup) need explicit non-interactive flag** — `--mcp` for ctx7, `--yes` for npx
- **Interactive select prompts crash with `UV_HANDLE_CLOSING`** on Windows when piped — use a longer timeout instead of trying to pipe input
- **Mission command typos** — `graphify opencode install` (wrong) vs `graphify install --platform opencode` (correct); inquirer prompts non-blocking on Windows ssh-style pipes
- **Mission command typos** — `--obsidian --obsidian-dir "..."` (wrong flags) vs `graphify export obsidian --dir "..."` (correct)
- **NVIDIA API key NOT supported as ctx7 LLM backend** — use `--code-only --no-label` to bypass LLM community naming
- **Stale `skills-lock.json` paths** — wrote `skills/` but actual files at `.agents/skills/`; lockfile was never patched correctly
- **117 tree queries cascade into 4GB RAM thrash** — Graphify's README at session-end prevents this
- **Always rephrase `npm install` commands** — 21st.dev CLI package is `@21st-dev/cli@latest` not `21st` (the bin name)
- **`npm test` runs `vitest run` (one-shot)**, NOT watch mode — vitest@4.x changed CLI defaults; always specify `--run` explicitly or use `vitest` binar
- **`npm install --save-dev` moves top-level packages** — even if they were in `dependencies` originally (e.g. `@tanstack/react-query`); always check `package.json` after install and move back to `dependencies` if runtime-used
- **Vitest needs `@vitest/coverage-v8` separately** — coverage-v8 is NOT bundled with vitest@4.x; install explicitly for `npm run test:coverage` to work
- **`parseAxmFlags` regex must skip the `/axm` token** — naive split-by-space includes `/axm` in `queryTokens`; explicit `token !== "/axm"` check required
- **`tsc --noEmit` flags `framer-motion` and `@tanstack/react-query` as missing declarations** — pre-existing pattern in this codebase using `latest` versions without `.d.ts` resolution; SWC handles at build-time but `tsc` strict-mode flags; runtime works fine. Use `next build` or `vitest` for verification instead
- **Windows Turbopack fail** — `next build` fails on Windows x64 with "Turbopack is not supported on this platform"; `next build --webpack` workaround also fails due to `@next/swc-win32-x64-msvc.node` binary issue. Build verification via Vitest + dev server only

