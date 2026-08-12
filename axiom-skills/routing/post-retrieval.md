---
name: post-retrieval
description: "Routes after Librarian based on evidence status, document count, and AXM-CLI commands"
type: router

routes:
  - condition: "status == 'no_evidence'"
    target: end
  - condition: "'-c' in command or len(filenames) > 1"
    target: strategist
  - condition: "default"
    target: editor
---

# Post-Retrieval Routing

Determines the next node in the graph after the Librarian retrieves evidence.

## Decision Tree

1. **No evidence found** → `END` (no context to audit).
2. **Comparative mode** (`-c` flag or >1 filename) → `Strategist` (cross-doc analysis).
3. **Default** (single file or vault mode) → `Editor` (evidence distillation).

## Notes

- The `-c` flag check uses substring matching: `"-c" in command`.
- `len(filenames) > 1` triggers Strategist even without the explicit `-c` flag.
- The `"no_evidence"` status is set by the Librarian when `hybrid_search`
  returns an empty list.
