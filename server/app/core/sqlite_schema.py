"""SQLite multi-vault schema for the SiaS sidecar (Phase 1a).

Per-client vault: one ``.db`` file per audit client (``vaults/client_<slug>.db``).
There are no ``vault_id`` columns — each file IS one vault, so isolation
between engagements holds by construction (decision: D3 in
``docs/DECISIONS/2026-08-16-sqlite-multi-vault.md``).

Two vec0 virtual tables serve the two embedding dimensions:
- ``chunks_nv1024``  — 1024-d cloud embeddings (NVIDIA NIM, BYOK)
- ``chunks_local384`` — 384-d local embeddings (MiniLM ONNX, Phase 2)

vec0 non-vector columns (``document_id``, ``chunk_index``, ``content``) are
stored as metadata and returned by KNN queries.
"""

from __future__ import annotations

import sqlite3
from typing import Optional

import sqlite_vec

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    status TEXT DEFAULT 'processing',
    is_permanent INTEGER DEFAULT 0,
    chunk_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    metadata_json TEXT
);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_nv1024 USING vec0(
    id INTEGER PRIMARY KEY,
    document_id INTEGER,
    chunk_index INTEGER,
    content TEXT,
    embedding FLOAT[1024]
);

CREATE VIRTUAL TABLE IF NOT EXISTS chunks_local384 USING vec0(
    id INTEGER PRIMARY KEY,
    document_id INTEGER,
    chunk_index INTEGER,
    content TEXT,
    embedding FLOAT[384]
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id INTEGER,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metrics_json TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    faithfulness REAL,
    precision REAL,
    relevance REAL,
    latency REAL,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key_hash TEXT NOT NULL,
    name TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
"""


def initialize_db(conn: sqlite3.Connection) -> None:
    """Load the vec0 extension, apply the schema, and set runtime pragmas.

    Idempotent — safe to call on every connection open.
    """
    conn.enable_load_extension(True)
    sqlite_vec.load(conn)
    conn.enable_load_extension(False)
    conn.executescript(SCHEMA_SQL)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")


def open_vault_db(path: str) -> sqlite3.Connection:
    """Open (or create) a vault database fully initialized for use."""
    conn = sqlite3.connect(
        path,
        check_same_thread=False,
        isolation_level=None,  # autocommit: single-statement ops, no tx juggling
    )
    initialize_db(conn)
    return conn
