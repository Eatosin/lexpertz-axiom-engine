"""Thin vec0 (sqlite-vec) wrapper for embedded vector search (Phase 1a).

Handles both embedding dimensions (1024-d NVIDIA cloud / 384-d MiniLM local)
via two virtual tables. Vectors are normalized to unit length before insert,
so the vec0 Euclidean distance is monotonic with cosine similarity — the
ranking is equivalent to cosine search.
"""

from __future__ import annotations

import json
import math
import sqlite3
from typing import Any, Dict, List, Optional

import numpy as np

CHUNKS_NV = "chunks_nv1024"
CHUNKS_LOCAL = "chunks_local384"

_TABLES = frozenset({CHUNKS_NV, CHUNKS_LOCAL})


class Vec0Store:
    """Create/insert/query interface over the vec0 virtual tables."""

    @staticmethod
    def normalize(embedding: List[float]) -> List[float]:
        """Return ``embedding`` scaled to unit length.

        Raises ``ValueError`` for a zero vector (cannot be normalized).
        """
        arr = np.asarray(embedding, dtype=np.float32)
        norm = float(np.linalg.norm(arr))
        if norm == 0.0 or not math.isfinite(norm):
            raise ValueError("cannot normalize a zero or non-finite embedding")
        return (arr / norm).astype(np.float32).tolist()

    @staticmethod
    def create_tables(conn: sqlite3.Connection) -> None:
        from app.core.sqlite_schema import initialize_db

        initialize_db(conn)

    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    @staticmethod
    def _table_name(table: str) -> str:
        if table not in _TABLES:
            raise ValueError(f"unknown vec0 table: {table!r}")
        return table

    def insert(
        self,
        table: str,
        *,
        content: str,
        embedding: List[float],
        document_id: int,
        chunk_index: int,
        row_id: Optional[int] = None,
    ) -> int:
        """Insert one normalized chunk; returns its storage id."""
        table = self._table_name(table)
        normalized = self.normalize(embedding)
        vector = json.dumps(normalized)
        if row_id is None:
            cur = self._conn.execute(
                f"INSERT INTO {table} (document_id, chunk_index, content, embedding) "
                "VALUES (?, ?, ?, ?)",
                (document_id, chunk_index, content, vector),
            )
            return int(cur.lastrowid)
        self._conn.execute(
            f"INSERT INTO {table} (id, document_id, chunk_index, content, embedding) "
            "VALUES (?, ?, ?, ?, ?)",
            (row_id, document_id, chunk_index, content, vector),
        )
        return row_id

    def query(
        self, table: str, embedding: List[float], k: int = 10
    ) -> List[Dict[str, Any]]:
        """Return up to ``k`` nearest chunks, closest first, with ``distance``.

        Embeddings are normalized before matching, so ``distance`` is the
        squared Euclidean distance on the unit sphere (cosine-equivalent).
        """
        table = self._table_name(table)
        vector = json.dumps(self.normalize(embedding))
        rows = self._conn.execute(
            f"SELECT id, document_id, chunk_index, content, distance "
            f"FROM {table} WHERE embedding MATCH ? AND k = ?",
            (vector, k),
        ).fetchall()
        return [
            {
                "id": row[0],
                "document_id": row[1],
                "chunk_index": row[2],
                "content": row[3],
                "distance": float(row[4]),
            }
            for row in rows
        ]

    def count(self, table: str) -> int:
        """Total rows in a vec0 table (metadata tables report counts too)."""
        table = self._table_name(table)
        row = self._conn.execute(f"SELECT COUNT(*) FROM {table}").fetchone()
        return int(row[0])

    def delete_by_document(self, table: str, document_id: int) -> int:
        """Delete all chunks of a document; returns the number removed."""
        table = self._table_name(table)
        cur = self._conn.execute(
            f"DELETE FROM {table} WHERE document_id = ?", (document_id,)
        )
        return int(cur.rowcount)
