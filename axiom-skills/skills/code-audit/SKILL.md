---
name: code-audit
display_name: "GitHub Code Audit"
description: "Cross-references local source code against vault PDF documents"
type: skill

config:
  skip_retrieval: true
  exhibit_format: |
    --- EXHIBIT_START_ID_CODE ---
    FILE_SOURCE: GitHub Evidence | File: {file_path}
    DATA_CONTENT: {file_content}
    --- EXHIBIT_END_ID_CODE ---
  query_wrapper: |
    Audit this codebase implementation against the provided vault evidence.

    ### GITHUB CODE ({file_path}):
    {file_content}

    ### AUDIT QUERY:
    {audit_query}
---

# Code Audit Skill (GitHub)

The code-audit skill cross-references local source code against
vault PDF documents. It runs the same LangGraph pipeline as a normal
audit but bypasses the Librarian's `hybrid_search` step and instead
pre-loads `documents` with a merged context:

1. PDF evidence pulled from the vault (optional).
2. A synthetic `EXHIBIT_START_ID_CODE` envelope wrapping the supplied code.

## When to Use

- Cross-check that local code implements the policies stated in corporate PDFs.
- Verify that a contract clause maps to a specific code path.

## State Initialization

This skill sets `skip_retrieval=True` on `AgentState` so the Librarian
returns the pre-loaded `documents` instead of running `hybrid_search`.

## Exhibit Format

| Field | Source |
|-------|--------|
| `EXHIBIT_START_ID_CODE` | Synthetic marker for code content |
| `FILE_SOURCE` | `GitHub Evidence \| File: {file_path}` |
| `DATA_CONTENT` | The literal source code being audited |
