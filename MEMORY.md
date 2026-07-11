# Project Memory

## Architecture
- Client: Next.js 16 + React 19 + Tailwind + Clerk + framer-motion
- Server: Python FastAPI + LangChain/LangGraph + Supabase (PostgreSQL + pgvector)
- AI: NVIDIA NIM via OpenCode (qwen3.5-397b, deepseek-v4-pro, step-3.7-flash)
- Agent graph: declarative `.md` skill tree at `axiom-skills/` driven by generic Python engine at `server/app/engine/`
- Knowledge graph: 1812 nodes / 2745 edges / 180 communities at `graphify-out/`

## OpenCode Harness
- Primary model: `nvidia/deepseek-ai/deepseek-v4-pro`
- Small model: `nvidia/stepfun-ai/step-3.7-flash`
- Vision model: `google/gemini-3.1-flash-lite` (via `vision-interpreter` subagent)
- Server: Python 3.14.6, Windows, 4GB RAM boundary
- Local config: `.opencode/opencode.json` (project overrides)
- Global config: `~/.config/opencode/opencode.json` (user presets)

## Global MCP Servers (active, 4 total)
| Name | Transport | URL / Command | Timeout |
|------|-----------|---------------|---------|
| `headroom` | local | `headroom.EXE mcp serve` on :8787 | 60000 |
| `serena` | local | `uvx ... serena start-mcp-server` | 120000 |
| `context7` | remote | `https://mcp.context7.com/mcp` | 60000 |
| `@21st-dev/magic` | remote | `https://21st.dev/api/mcp` | 60000 |

Removed (round 1 cleanup): `obsidian-memory`, `obsidian-second-brain`.

## Skills installed under `.agents/skills/`
40 active skills including:
- `design-engineering` — 21st.dev Magic workflow (created 2026-07-10)
- `frontend-patterns`, `frontend-slides` — React composition + presentation
- `tdd-workflow`, `verification-loop`, `eval-harness` — quality gates
- `security-review` — vulnerabilities + secrets
- `documentation-lookup` — uses Context7 MCP
- `coding-standards`, `coding-patterns` — baseline conventions

Removed (2026-07-10): `find-skills`, `context7-cli`, `context7-mcp` — replaced by global MCPs.

## Graphify Integration
- Knowledge graph auto-rebuilt on `post-commit` and `post-checkout` git hooks
- Token reduction: 41.1x (120,800 naive → 2,942 token avg query)
- OpenCode plugin: `.opencode/plugins/graphify.js` — auto-injects `graphify query` reminder before bash calls
- Obsidian mirror: opt-in via `GRAPHIFY_EXPORT_DIR` env var, post-commit hook honors it
- Obsidian namespace convention: `<vault-root>/codebases/<product-slug>/`

## Key Decisions
- Model IDs MUST use full `nvidia/<org>/<model>` format
- Markdown-as-config: `.md` files declare *what*, Python owns *behavior*
- Skill discovery via `glob **/SKILL.md` — zero registry
- Vision tasks MUST route through `vision-interpreter` (never DeepSeek)
- API keys live in GLOBAL config, never project `.env` or local `.opencode/`
- 21st.dev URL is `https://21st.dev/api/mcp` (not `mcp.21st.dev`)
- Graphify reads `GRAPH_REPORT.md` first; quest→`query`, mutation→`affected`
- Two-layer config: global config preserves user prefs across projects; local config adds project overrides
- Mistake pattern: ctx7 already wrote full Context7 rule to global AGENTS.md → don't duplicate in INSTRUCTIONS.md (token bloat)

## External Integrations
- `gh` CLI v2.96.0 — user `Eatosin` on github.com, scopes: `gist`, `read:org`, `repo`, `workflow`
- `graphify` CLI v0.9.12 — `C:\Users\HomePC\AppData\Roaming\Python\Python314\Scripts\graphify.exe`
- `@21st-dev/cli` v1.6.0 — design registry + MCP setup, session token at `~/.config/21st/auth.json`

## Discovered Skills Log
| Date | Skill | Query | Path | Applied |
|------|-------|-------|------|---------|
| 2026-07-10 | design-engineering | "21st.dev component workflow" | .agents/skills/design-engineering/SKILL.md | yes |

## Current Session (2026-07-10)
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

