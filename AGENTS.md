# Everything Claude Code (ECC) — Agent Instructions

This is a **production-ready AI coding plugin** providing 67 specialized agents, 277 skills, 93 commands, and automated hook workflows for software development.

**Version:** 2.0.0

## Core Principles

1. **Agent-First** — Delegate to specialized agents for domain tasks
2. **Test-Driven** — Write tests before implementation, 80%+ coverage required
3. **Security-First** — Never compromise on security; validate all inputs
4. **Immutability** — Always create new objects, never mutate existing ones
5. **Plan Before Execute** — Plan complex features before writing code

## Available Agents

| Agent | Purpose | When to Use |
|-------|---------|-------------|
| planner | Implementation planning | Complex features, refactoring |
| architect | System design and scalability | Architectural decisions |
| tdd-guide | Test-driven development | New features, bug fixes |
| code-reviewer | Code quality and maintainability | After writing/modifying code |
| security-reviewer | Vulnerability detection | Before commits, sensitive code |
| spec-miner | Brownfield spec extraction | Onboarding brownfield projects to spec-driven development |
| build-error-resolver | Fix build/type errors | When build fails |
| e2e-runner | End-to-end Playwright testing | Critical user flows |
| refactor-cleaner | Dead code cleanup | Code maintenance |
| doc-updater | Documentation and codemaps | Updating docs |
| cpp-reviewer | C/C++ code review | C and C++ projects |
| cpp-build-resolver | C/C++ build errors | C and C++ build failures |
| fsharp-reviewer | F# functional code review | F# projects |
| docs-lookup | Documentation lookup via Context7 | API/docs questions |
| go-reviewer | Go code review | Go projects |
| go-build-resolver | Go build errors | Go build failures |
| kotlin-reviewer | Kotlin code review | Kotlin/Android/KMP projects |
| kotlin-build-resolver | Kotlin/Gradle build errors | Kotlin build failures |
| database-reviewer | PostgreSQL/Supabase specialist | Schema design, query optimization |
| python-reviewer | Python code review | Python projects |
| django-reviewer | Django code review | Django apps, DRF APIs, ORM, migrations |
| django-build-resolver | Django build, migration, and setup errors | Django startup, dependency, migration, collectstatic failures |
| java-reviewer | Java and Spring Boot code review | Java/Spring Boot projects |
| java-build-resolver | Java/Maven/Gradle build errors | Java build failures |
| loop-operator | Autonomous loop execution | Run loops safely, monitor stalls, intervene |
| harness-optimizer | Harness config tuning | Reliability, cost, throughput |
| rust-reviewer | Rust code review | Rust projects |
| rust-build-resolver | Rust build errors | Rust build failures |
| pytorch-build-resolver | PyTorch runtime/CUDA/training errors | PyTorch build/training failures |
| mle-reviewer | Production ML pipeline review | ML pipelines, evals, serving, monitoring, rollback |
| typescript-reviewer | TypeScript/JavaScript code review | TypeScript/JavaScript projects |
| vision-interpreter | Multimodal image/wireframe/UI analysis | Convert images/screenshot/wireframe → structured markdown spec |

## Agent Orchestration

Use agents proactively without user prompt:
- Complex feature requests → **planner**
- Code just written/modified → **code-reviewer**
- Bug fix or new feature → **tdd-guide**
- Architectural decision → **architect**
- Security-sensitive code → **security-reviewer**
- Brownfield project onboarding → **spec-miner**
- Autonomous loops / loop monitoring → **loop-operator**
- Harness config reliability and cost → **harness-optimizer**

Use parallel execution for independent operations — launch multiple agents simultaneously.

## Dynamic Skill Discovery Protocol (Just-In-Time Loading)

### Rules
1. **RULE 1 (SEARCH FIRST)** — Before performing any complex engineering task, the agent MUST query `find-skills` (or run `npx skills find "<query>"`) with a query related to the task. Do not load the entire skills library into context — discover only.
2. **RULE 2 (LOAD JIT)** — Inject only the content of the discovered skill into the active context. Read the `SKILL.md` of the single matched skill, never the whole directory tree.
3. **RULE 3 (LOGGING)** — Every skill discovered and consumed MUST be logged in `MEMORY.md` under a `## Discovered Skills Log` section. Record: skill name, query used, file path, and whether it was applied.

### Discovery Workflow
1. `build` agent receives a task
2. `build` invokes `npx skills find "<task keywords>"` (or uses the installed `find-skills` SKILL.md)
3. Review ranked results (prefer 1K+ installs, reputable sources like `vercel-labs`, `anthropics`, `microsoft`)
4. Install if missing: `npx skills add <owner/repo@skill> -y`
5. Read the matched `SKILL.md` into active context
6. Apply skill guidance to the task
7. Log discovery in `MEMORY.md`

### RAM Optimization Rationale
Loading all 277 skills at session start would burn ~1.4M tokens. JIT discovery keeps baseline context lean and preserves the 4GB RAM budget by loading only what the current task requires.

## Context7 MCP — Live Documentation Fetching

When the user asks about libraries, frameworks, or needs current API references:
1. Resolve the library ID via `resolve-library-id` (libraryName + query)
2. Fetch docs via `query-docs` (libraryId + scoped query)
3. One topic per query — split multi-topic questions into separate calls
4. Prefer official/primary packages over community forks
5. Cite the library version when relevant in the response

This replaces reliance on stale training data with live, version-accurate documentation.

## Modality Routing Protocol (Vision Delegation)

### Image Input Handling
When a user references or uploads an image (wireframe, screenshot, mockup, diagram):

1. **Detection Phase** — The primary `build` agent detects an image input (file path ending in `.png|.jpg|.jpeg|.webp|.gif`, or explicit "wireframe/screenshot/mockup" mention).
2. **NO DIRECT READ** — The `build` agent MUST NOT attempt to read or interpret the image directly. DeepSeek V4 Pro is text-only; attempting vision tasks wastes tokens and produces poor output.
3. **Delegation Phase** — `build` delegates to the `vision-interpreter` subagent (Gemini 3.1 Flash Lite) via the task tool.
4. **Extraction Phase** — `vision-interpreter` parses the image and returns a clean, text-based `### Architecture Overview`, `### Layout Grid`, `### Component Inventory`, `### Interaction Flow`, and `### Implementation Notes` markdown spec.
5. **Execution Phase** — `build` takes this text specification and writes the actual implementation code based on the parsed structure.

### Routing Decision Table
| Input Type | Routing |
|------------|---------|
| Text-only query | `build` agent handles directly |
| Image + text | `build` → `vision-interpreter` → receives spec → implements |
| Code screenshot | `vision-interpreter` extracts structure → `build` extends |
| Architecture diagram | `vision-interpreter` extracts components → `architect` reviews |

## GitHub CLI Integration

The `gh` CLI (v2.96.0+) is authenticated as `Eatosin` on github.com. All agents can use it for:
- Issue management: `gh issue create|list|view|close`
- PR workflows: `gh pr create|view|merge|review`
- Repository operations: `gh repo clone|view|sync`
- Release management: `gh release create|view`

When the user mentions GitHub operations, prefer `gh` CLI over raw API calls — it handles auth, pagination, and rate limits automatically.

## Autonomous Tool-Chain Hierarchy (Cognitive Instruction Set)

### Tool-Chain Layer Architecture (Priority Order)
1. **Headroom Proxy** — Token optimization & context compression (intercepts all model requests)
2. **find-skills** — Just-In-Time skill discovery (search → install → load SKILL.md only when needed)
3. **Serena MCP** — Semantic code intelligence (symbol lookup, cross-ref, codebase indexing)
4. **Context7 MCP** — Live documentation fetching (replaces stale training data with current API refs)
5. **GitHub CLI** — Autonomous repo/issue/PR/release management via `gh` CLI v2.96.0+
6. **Obsidian-Second-Brain** — PARA-structured project knowledge (decisions, ADRs, patterns)
7. **Obsidian-Memory** — Session persistence (auto-save/recall per project)
8. **NVIDIA NIM Models** — qwen3.5-397b (primary) + deepseek-v4-pro (planner) + deepseek-v4-flash (harness-optimizer) + step-3.7-flash (loop-operator) + gemini-3.1-flash-lite (vision)

### Build Agent → Planner (DeepSeek V4 Pro) Invocation Protocol
The `build` agent (DeepSeek V4 Pro) delegates to `planner` (DeepSeek V4 Pro) under these conditions:
- Multi-file feature architecture (>2 affected modules)
- API contract changes affecting >1 consumer
- Database schema migrations
- Security-sensitive implementations (auth, payments, crypto)
- Refactoring touching >3 modules

**Invocation flow:**
1. `build` agent detects complexity threshold
2. `build` queries `serena` for affected symbol graph (shallow index first)
3. `build` queries `obsidian-second-brain` for architectural decisions
4. `build` invokes `planner` subagent (DeepSeek V4 Pro) with compressed context bundle
5. `planner` returns phased implementation plan
6. `build` executes plan incrementally

### Serena MCP — Symbol Intelligence Protocol
- **Always call `serena.get_symbols_overview`** before modifying any file
- **Use `serena.find_referencing_symbols`** before renaming/deleting exports
- **Initial indexing:** shallow (`--shallow-index`, max 2 threads) for 4GB RAM safety
- **Staggered deepening:** during idle periods, deepen index for specific modules on demand
- **Max concurrent Serena calls:** 2 (hardware constraint)

### Obsidian MCPs — Dual Knowledge Layer
| MCP | Layer | When to use |
|-----|-------|-------------|
| **obsidian-second-brain** | Semantic knowledge | Query architectural decisions, ADRs, patterns, project conventions |
| **obsidian-memory** | Episodic memory | Auto-save on /checkpoint, recall on /resume, session tracking |

- **Obsidian must be running** — Local REST API plugin (port 27124) required
- **Never hardcode Bearer tokens** — use env vars or global config injection

### Headroom Proxy — Context Compression
- **Always active** — intercepts all model requests via port 8787
- **Compression target:** 60-90% token reduction
- **Health check:** `curl http://127.0.0.1:8787/health` before MCP handshakes
- Headroom MCP provides `headroom_compress` / `headroom_retrieve` / `headroom_stats` tools

### Failure Handling & Retry Logic
| Failure | Retry Strategy |
|---------|----------------|
| MCP timeout (>60s) | Kill process, re-spawn with fresh context, max 3 retries |
| Connection closed | Re-spawn MCP, verify Obsidian running if relevant |
| Serena index stall | Restart with `--shallow-index` + `--max-index-threads 2` |
| Headroom 404 | Restart `headroom wrap` on port 8787 |
| NVIDIA model 404 | Use `provider.nvidia.models` short-key + explicit `id` workaround |

### MCP Timeout Configuration
| MCP | Timeout | Rationale |
|-----|---------|-----------|
| obsidian-memory | 60000ms | REST API latency on 4GB RAM |
| obsidian-second-brain | 60000ms | PARA search queries |
| headroom | 60000ms | Compression overhead |
| serena | 120000ms | Initial indexing + deep symbol search |
| github | 60000ms | gh CLI wrapper calls |
| context7 | 60000ms | Live docs fetching |

## Security Guidelines

**Before ANY commit:**
- No hardcoded secrets (API keys, passwords, tokens)
- All user inputs validated
- SQL injection prevention (parameterized queries)
- XSS prevention (sanitized HTML)
- CSRF protection enabled
- Authentication/authorization verified
- Rate limiting on all endpoints
- Error messages don't leak sensitive data

**Secret management:** NEVER hardcode secrets. Use environment variables or a secret manager. Validate required secrets at startup. Rotate any exposed secrets immediately.

**If security issue found:** STOP → use security-reviewer agent → fix CRITICAL issues → rotate exposed secrets → review codebase for similar issues.

## Coding Style

**Immutability (CRITICAL):** Always create new objects, never mutate. Return new copies with changes applied.

**File organization:** Many small files over few large ones. 200-400 lines typical, 800 max. Organize by feature/domain, not by type. High cohesion, low coupling.

**Error handling:** Handle errors at every level. Provide user-friendly messages in UI code. Log detailed context server-side. Never silently swallow errors.

**Input validation:** Validate all user input at system boundaries. Use schema-based validation. Fail fast with clear messages. Never trust external data.

**Code quality checklist:**
- Functions small (<50 lines), files focused (<800 lines)
- No deep nesting (>4 levels)
- Proper error handling, no hardcoded values
- Readable, well-named identifiers

## Testing Requirements

**Minimum coverage: 80%**

Test types (all required):
1. **Unit tests** — Individual functions, utilities, components
2. **Integration tests** — API endpoints, database operations
3. **E2E tests** — Critical user flows

**TDD workflow (mandatory):**
1. Write test first (RED) — test should FAIL
2. Write minimal implementation (GREEN) — test should PASS
3. Refactor (IMPROVE) — verify coverage 80%+

Troubleshoot failures: check test isolation → verify mocks → fix implementation (not tests, unless tests are wrong).

## Development Workflow

1. **Plan** — Use planner agent, identify dependencies and risks, break into phases
2. **TDD** — Use tdd-guide agent, write tests first, implement, refactor
3. **Review** — Use code-reviewer agent immediately, address CRITICAL/HIGH issues
4. **Capture knowledge in the right place**
   - Personal debugging notes, preferences, and temporary context → auto memory
   - Team/project knowledge (architecture decisions, API changes, runbooks) → the project's existing docs structure
   - If the current task already produces the relevant docs or code comments, do not duplicate the same information elsewhere
   - If there is no obvious project doc location, ask before creating a new top-level file
5. **Commit** — Conventional commits format, comprehensive PR summaries

## Workflow Surface Policy

- `skills/` is the canonical workflow surface.
- New workflow contributions should land in `skills/` first.
- `commands/` is a legacy slash-entry compatibility surface and should only be added or updated when a shim is still required for migration or cross-harness parity.

## Git Workflow

**Commit format:** `<type>: <description>` — Types: feat, fix, refactor, docs, test, chore, perf, ci

**PR workflow:** Analyze full commit history → draft comprehensive summary → include test plan → push with `-u` flag.

## Architecture Patterns

**API response format:** Consistent envelope with success indicator, data payload, error message, and pagination metadata.

**Repository pattern:** Encapsulate data access behind standard interface (findAll, findById, create, update, delete). Business logic depends on abstract interface, not storage mechanism.

**Skeleton projects:** Search for battle-tested templates, evaluate with parallel agents (security, extensibility, relevance), clone best match, iterate within proven structure.

## Performance

**Context management:** Avoid last 20% of context window for large refactoring and multi-file features. Lower-sensitivity tasks (single edits, docs, simple fixes) tolerate higher utilization.

**Build troubleshooting:** Use build-error-resolver agent → analyze errors → fix incrementally → verify after each fix.

## Project Structure

```
agents/          — 67 specialized subagents
skills/          — 277 workflow skills and domain knowledge
commands/        — 93 slash commands
hooks/           — Trigger-based automations
rules/           — Always-follow guidelines (common + per-language)
scripts/         — Cross-platform Node.js utilities
mcp-configs/     — 14 MCP server configurations
tests/           — Test suite
```

`commands/` remains in the repo for compatibility, but the long-term direction is skills-first.

## Success Metrics

- All tests pass with 80%+ coverage
- No security vulnerabilities
- Code is readable and maintainable
- Performance is acceptable
- User requirements are met


<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. This reduces context
usage by 60-90% with zero behavior change. If rtk has no filter for a command,
it passes through unchanged — so it is always safe to use.

## Key Commands
```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) — shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) — shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules
- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`
- For debugging, use raw command without rtk prefix
- `rtk proxy <cmd>` runs command without filtering but tracks usage
<!-- /headroom:rtk-instructions -->

---

## Context Navigation Mandate (graphify-first)

The repo carries a knowledge graph at `graphify-out/` (1812 nodes, 2745
edges, 180 communities). All agents MUST use it instead of raw scan.

| Step | Action | When |
|-----:|--------|------|
| 1 | Read `graphify-out/GRAPH_REPORT.md` | Session start |
| 2 | `graphify query "<concept>"` | Need call paths / relations |
| 3 | `graphify explain <symbol>` | Single symbol lookup |
| 4 | `graphify affected "<symbol>"` | Before refactoring |
| 5 | Open **only** the file the graph points to | About to edit |
| 6 | `git grep` / `grep` | Graph unavailable, raw fallback |

### Strict Rules
- **Rule 1:** Read `GRAPH_REPORT.md` first; use the 180-community table
  as the module map. Do not `ls`, `find`, or recursive `grep` the tree.
- **Rule 2:** Do not `cat` folders. Locate files by following call
  paths / community IDs in the graph.
- **Rule 3:** Reasoning, planning, and review work from the graph alone.
  Only read raw implementation files when actually modifying code.
- **Rule 4:** `GRAPH_REPORT.md` is the 30K-ft map; `graphify query` is
  the 1K-ft scoped subgraph. Never both at once.
- **Rule 5:** Focused question → `graphify query "<topic>"`. Blanket
  exploration → `GRAPH_REPORT.md`. Fall back to raw grep **only** when
  the graph is unavailable.

### Maintenance

| Trigger | Command |
|---------|---------|
| Auto (post-commit) | git hook installed via `graphify hook install` |
| Auto (post-checkout) | git hook installed via `graphify hook install` |
| Manual (fast) | `graphify update . --code-only` |
| Manual (full) | `graphify . --code-only --no-label --no-viz` |
| Obsidian re-sync | `graphify export obsidian --dir "~\\Documents\\Obsidian\\my-brain"` |

The graph stays in sync with the working tree automatically — agents
should never need a full rebuild mid-session.

---

## Design Engineering Pipeline (21st.dev Magic)

The 21st.dev Magic MCP server is wired in globally (`@21st-dev/magic`,
remote) and exposes `search_components` + `get_component`. Never write
visual UI from scratch — always search the registry first.

### Rule 1: Search Before Writing
When building, modifying, or refactoring visual components (UI/UX),
MUST call `search_components` first:

```
search_components(query: "animated navbar with dropdown", limit: 5)
```

The query must describe layout (horizontal/vertical/grid), animation
style (staggered/slide/fade/scale), state requirements
(hover/active/disabled), and any Tailwind-specific conventions
(gradient backgrounds, glass-morphism, border glow).

### Rule 2: Dependency Resolution
When a component requires `framer-motion`, `lucide-react`, `clsx`,
`tailwind-merge`, or `@radix-ui/*`:

1. Check `package.json` `dependencies` and `devDependencies` first.
2. `npm install <missing-package>` before writing any code.
3. Verify versions match the component's `peerDependencies`.
4. If 3+ new packages are required, prefer `21st add <component-id>`
   via the CLI for shadcn-style auto-resolution.

### Rule 3: Multi-Agent Visual Pipeline

| Step | Agent | Tool | Output |
|------|-------|------|--------|
| 1. Vision | `vision-interpreter` (Gemini 3.1 Flash Lite) | Image → markdown spec | Layout, spacing, animations described |
| 2. Discovery | `planner` (DeepSeek V4 Pro / Nemotron-3) | `search_components` | 3-5 candidate components with scores |
| 3. Execution | `build` (DeepSeek V4 Pro) | `get_component` + install deps | Working component in the codebase |

Reuse the existing `vision-interpreter` subagent — do NOT create a
duplicate vision agent.

### Rule 4: No "AI Slop" Components

Forbidden patterns:

| Anti-pattern | Replacement |
|--------------|-------------|
| Bare `<div className="flex flex-col gap-4 p-6">` without design system | Use theme tokens, component utilities |
| Hardcoded colors (`bg-blue-500`, `#3B82F6`) | CSS custom properties or Tailwind theme extensions |
| Missing hover/focus/active/disabled states | Every interactive element handles all four states |
| Static elements without framer-motion | Buttons, toggles, cards, modals animate on mount/exit |
| Light mode only | All components support `dark:` variant |
| No loading/empty states | Data-dependent components render skeleton/spinner placeholders |
| `<img>` without `alt`, `sizes`, `loading="lazy"` | Accessible and performant images |

### Rule 5: Attribution
Every component adapted from 21st.dev MUST include a source comment:

```tsx
// Adapted from 21st.dev Magic: <component-name> by <author>
// Source: https://21st.dev/<path>/<id>
```

### Model Routing

| Task | Model |
|------|-------|
| Search / component lookup | `nvidia/stepfun-ai/step-3.7-flash` (fast) |
| Complex UI refactoring / structural gluing | `nvidia/deepseek-ai/deepseek-v4-pro` (high-fidelity) |
| Wireframe-to-spec (image → markdown) | existing `vision-interpreter` (Gemini 3.1 Flash Lite) |

### Related Skills

- `design-engineering` (`.agents/skills/design-engineering/SKILL.md`) —
  component-discovery prompt templates
- `frontend-patterns` (`skills/frontend-patterns/SKILL.md`) — React
  composition, hooks, accessibility patterns
