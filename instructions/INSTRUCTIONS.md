# INSTRUCTIONS

Per-agent execution instructions, applied in addition to root `AGENTS.md`.

## Context Navigation (graphify-first)

Follow the graphify-first workflow documented in `AGENTS.md`. Key rules:

- **No Directory Dumps:** Do not `cat` folders, list top-level directories, or
  use unmasked recursive `grep`. Locate files by following call paths in the
  graph.
- **Execution Boundary:** Only open raw implementation files when actually
  modifying code. Reasoning, planning, and review work from the graph alone.
- **Routing:** Focused question → `graphify query "<topic>"`. Blanket
  exploration → `GRAPH_REPORT.md`. Never both at once.

## Context7 Protocol

Context7 MCP is configured globally. The full protocol (when to invoke,
library-id resolution steps, `query-docs` scope rules) is in the global
`AGENTS.md` context7 block. Follow that protocol rather than relying on stale
training data for any library, framework, SDK, API, or CLI tool documentation.
