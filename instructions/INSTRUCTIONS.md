# INSTRUCTIONS

Per-agent execution instructions, applied in addition to root `AGENTS.md`.

## Context Navigation Mandate (graphify-first)

The repo carries a structured knowledge graph under `graphify-out/`. All
agents MUST use it instead of raw filesystem scanning.

| Order | Tool | When |
|------:|------|-----|
| 1 | Read `graphify-out/GRAPH_REPORT.md` on session start | Always |
| 2 | `graphify query "<concept>"` for a scoped subgraph | Need call paths, callers, or relations |
| 3 | `graphify explain <symbol>` to learn a single symbol | Single-symbol lookup |
| 4 | `graphify affected "<symbol>"` to find blast radius | Before refactoring |
| 5 | Open the **most specific file** the graph points to | Only now read raw code |
| 6 | `git grep` / `grep` | Last resort — fallback when graph is unavailable |

## Strict Rules

- **Rule 1 (Structural Navigation):** Read
  `graphify-out/GRAPH_REPORT.md` first. Use the 180-community table as
  the module map; do not run `ls`, `find`, or recursive `grep` to map
  the repo.
- **Rule 2 (No Directory Dumps):** Do not `cat` folders, list top-level
  directories, or use unmasked recursive `grep`. Locate files strictly
  by following the call paths / community IDs in the graph.
- **Rule 3 (Execution Boundary):** Only open raw implementation files
  when actually modifying code. Reasoning, planning, and review work
  from the graph alone.
- **Rule 4 (GRAPH_REPORT + query):** `GRAPH_REPORT.md` for the 30,000-ft
  map; `graphify query` for the 1,000-ft scoped subgraph. Never load
  the full tree into context.
- **Rule 5 (Routing):** Focused question → `graphify query "<topic>"`.
  Blanket exploration → `GRAPH_REPORT.md`. Never both at once.

## Maintenance

The graph is regenerated automatically by:

- `post-commit` hook (after every commit)
- `post-checkout` hook (after branch switch)
- Manual: `graphify update . --code-only` (fast, no API key)

To rebuild from scratch: `graphify . --code-only --no-label --no-viz`.

## Context7 Protocol

Context7 MCP is configured globally. The full protocol (when to invoke, library-id
resolution steps, `query-docs` scope rules) is in the global `AGENTS.md` context7 block.
Agents should follow that protocol rather than relying on stale training data
for any library, framework, SDK, API, or CLI tool documentation.
