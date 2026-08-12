---
name: dataset-audit
display_name: "Live Dataset Audit"
description: "Reconciles PDF evidence against a LIVE structured dataset (CSV/JSONB)"
type: skill

config:
  skip_retrieval: true
  upload_replace_semantics: true
  max_records_for_audit: 500
  exhibit_format: |
    --- EXHIBIT_START_ID_DATABASE ---
    FILE_SOURCE: Live Axiom Database | Dataset: {dataset_name}
    DATA_CONTENT: {dataset_content}
    --- EXHIBIT_END_ID_DATABASE ---
  query_wrapper: |
    Audit the static document claims against the LIVE structured dataset below.

    ### LIVE DATASET ({dataset_name}):
    {dataset_content}

    ### AUDIT QUERY:
    {audit_query}
---

# Dataset Audit Skill

The dataset-audit skill reconciles statements in PDFs against a LIVE
structured dataset (CSV uploaded into the user's `user_datasets` table).

## Two-Phase Operation

1. **Ingest** (`upload_csv_dataset`): Uploads a CSV to the user's
   JSONB vault under a given `dataset_name`. Replaces any existing
   dataset with that name (upload_replace_semantics: true).
2. **Audit** (`audit_live_dataset`): Pulls up to `max_records_for_audit`
   records, wraps them in an `EXHIBIT_START_ID_DATABASE` envelope,
   and merges with fetched PDF context.

## State Initialization

Sets `skip_retrieval=True` on `AgentState` so the Librarian returns
the pre-loaded `documents` instead of running `hybrid_search`.

## Exhibit Format

| Field | Source |
|-------|--------|
| `EXHIBIT_START_ID_DATABASE` | Synthetic marker for dataset rows |
| `FILE_SOURCE` | `Live Axiom Database \| Dataset: {dataset_name}` |
| `DATA_CONTENT` | JSON-serialized dataset records (capped at 500) |
