# Decision: SQLite Multi-Vault with vec0 Vector Search (Phase 1a)

**Date:** 2026-08-16
**Status:** Accepted
**Scope:** Vault storage backend for the SiaS desktop sidecar (documents, chunks, vector search, chat history, telemetry)
**Supersedes:** Supabase pgvector as the vault backend (endpoints migrate in Sprint 3)

---

## Context

Phase 0 established the `VaultPort` seam with Supabase as the interim backend.
Phase 1 replaces it with per-client SQLite files so each audit engagement is a
separate `.db` — "zero data leakage between engagements" with no shared cloud
state. Vector search must work offline and embedded; `vec0` (sqlite-vec)
provides KNN search as a SQLite virtual table.

The pivot to Python 3.14 raised a portability question: sqlite-vec publishes
`py3-none-*` wheels (bundled precompiled `vec0.dll` / `.so`, pure-Python tag),
so unlike ABI-tagged packages (e.g. pyiceberg) it installs on any CPython 3 —
verified live on cp314 win_amd64 (load, DDL, insert, KNN query all OK).

## Decision

**Vault storage = per-client SQLite files with `vec0` vector search.**

- Vault file per client: `<axiom_home>/vaults/client_<slug>.db`; slug restricted
  to `[a-z0-9_-]` (fail fast on anything else — no path traversal)
- **No `vault_id` columns anywhere** (D3): each file IS one vault, isolation by
  construction; the PRD's redundant `vault_id` columns are dropped
- **Two vec0 virtual tables** (D2), one per embedding dimension:
  `chunks_nv1024` (`FLOAT[1024]`, cloud BYOK embeddings) and `chunks_local384`
  (`FLOAT[384]`, local MiniLM). Dimension inferred from `len(embedding)` at
  insert/search; anything else raises `ValueError`
- Vectors normalized to unit length before insert — vec0's Euclidean distance
  is then monotonic with cosine similarity (ranking-equivalent)
- `PRAGMA journal_mode=WAL` + `foreign_keys=ON` on every connection
- Sync `sqlite3` calls run through `asyncio.to_thread`, serialized per adapter
  with a reentrant lock; `isolation_level=None` (autocommit) — each op is a
  single statement, no transaction juggling
- `SiaSConfig.vault_type` selects the backend (`"sqlite"` default, `"supabase"`
  kept for the migration window); factory `get_vault()` in
  `app/core/adapters/__init__.py` raises on unknown types
- Backup/restore uses the `sqlite3.Connection.backup()` API (WAL-safe), not raw
  file copy — Sprint 3 (PRD 1.9)

## Rationale

| Consideration | SQLite multi-vault (final) | Supabase pgvector (legacy) |
|---------------|----------------------------|----------------------------|
| Privacy | Per-client files, fully local, zero shared cloud state | All clients in one cloud DB; multi-tenant leakage surface |
| Offline | Works with no network at all | Requires cloud |
| Vector search | vec0 KNN, embedded, no server | Requires pgvector + rpc |
| Ops | No provisioning, no credentials, trivially backed up by file | Account, project, secrets, migrations |
| Fit for SiaS | Yes — the whole point of the pivot | SaaS-era legacy |

Dual-table vs alternatives: padding 384→1024 distorts cosine distances and
wastes 62% of storage; truncating 1024→384 discards information. Fixed
dimension per vec0 table means two tables is the only correct option.

## Alternatives Considered

| Alternative | Verdict | Why rejected |
|-------------|---------|--------------|
| Single vec0 `FLOAT[1024]` table, pad 384-d | Rejected | Padding changes cosine semantics; storage waste |
| Single vec0 `FLOAT[384]` table, truncate 1024-d | Rejected | Loses embedding information |
| FTS5 + brute-force numpy search | Rejected | No ANN index; O(n) per query; not viable at scale |
| One shared `.db` + `vault_id` columns (PRD draft) | Rejected | Isolation by convention instead of by construction; PRD schema already assumed per-file DBs |
| Raw `.db` file copy for backup | Rejected | Corrupts under WAL; must checkpoint via backup API |
| Keep Supabase as default backend | Rejected | Defeats the SiaS privacy story |

## Consequences

- **New modules**: `app/core/sqlite_schema.py` (schema + `initialize_db` +
  `open_vault_db`), `app/core/vector_store.py` (`Vec0Store` wrapper), 
  `app/core/sqlite_adapter.py` (`SqliteVaultAdapter` — all 9 `VaultPort`
  methods), `app/core/adapters/__init__.py` (`get_vault` factory)
- **Config**: `SiaSConfig` gains `vault_type` (default `"sqlite"`)
- **requirements.txt**: add `sqlite-vec==0.1.9` (MIT/Apache-2.0)
- **PRD schema amendment**: `vault_id` columns dropped; second vec0 table
  (`chunks_local384`) added; `FLOAT[1024]` retained for cloud embeddings
- **Tests**: `tests/test_vector_store.py` + `tests/test_sqlite_adapter.py`
  (contract tests: CRUD, vec0 ranking, 384/1024 routing, multi-vault
  isolation, concurrency, slug validation) + `tests/test_adapter_factory.py`
- **Migration window**: `vault_type: "supabase"` keeps the legacy adapter
  selectable until Sprint 3 finishes endpoint migration; after that the
  supabase backend is removed
- **PRD_SIAS.md (archive)**: Phase 1 tasks 1.1–1.3/1.10 shipped; schema
  section amended (follow-up)
