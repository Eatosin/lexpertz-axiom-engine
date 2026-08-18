"""SQLite multi-vault adapter implementing VaultPort (Phase 1a, PRD 1.2).

One ``SqliteVaultAdapter`` instance is bound to a single vault
(``vaults/client_<slug>.db``) — the ``VaultPort`` methods carry no vault
parameter, so each instance serves one client. Isolation between
engagements holds by construction: different files, no shared state.

Sync ``sqlite3`` work is pushed to a worker thread via ``asyncio.to_thread``
and serialized per-adapter with a reentrant lock (one connection,
``check_same_thread=False``).
"""

from __future__ import annotations

import asyncio
import json
import re
import sqlite3
import threading
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional

from app.core.sqlite_schema import open_vault_db
from app.core.vector_store import CHUNKS_LOCAL, CHUNKS_NV, Vec0Store

_SLUG_RE = re.compile(r"^[a-z0-9_-]+$")
_FILE_RE = re.compile(r"^client_(.+)\.db$")


def _validate_slug(slug: str) -> str:
    """Validate a vault slug: ``[a-z0-9_-]`` only (no path traversal)."""
    if not _SLUG_RE.match(slug):
        raise ValueError(f"invalid vault slug {slug!r}: only [a-z0-9_-] allowed")
    return slug

DIM_LOCAL = 384
DIM_NV = 1024

# FTS5 rowids must be unique across both vec tables (each has its own
# autoincrement). 384-d chunk ids get a 2**48 offset; 1024-d ids stay as-is.
_FTS_LOCAL_OFFSET = 1 << 48
_FTS_TABLE = "chunks_fts"


def _fts_rowid(table: str, chunk_id: int) -> int:
    if table == CHUNKS_LOCAL:
        return chunk_id + _FTS_LOCAL_OFFSET
    return chunk_id


def _fts_decode(rowid: int) -> tuple:
    if rowid >= _FTS_LOCAL_OFFSET:
        return CHUNKS_LOCAL, rowid - _FTS_LOCAL_OFFSET
    return CHUNKS_NV, rowid


def _fts_query(text: str) -> str:
    """Build a safe FTS5 MATCH expression: quoted words ANDed together."""
    terms = [t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 1]
    return " AND ".join(f'"{t}"' for t in terms[:16])


class SqliteVaultAdapter:
    """VaultPort implementation backed by per-client SQLite files."""

    def __init__(self, vault_dir: Path, slug: str = "default") -> None:
        self._vault_dir = Path(vault_dir)
        self._slug = _validate_slug(slug)
        self._db_path = self._vault_dir / f"client_{self._slug}.db"
        self._lock = threading.RLock()
        self._conn: Optional[sqlite3.Connection] = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _connect(self) -> sqlite3.Connection:
        if self._conn is None:
            self._vault_dir.mkdir(parents=True, exist_ok=True)
            self._conn = open_vault_db(str(self._db_path))
        return self._conn

    def _run(self, func: Callable[..., Any], *args: Any) -> Any:
        """Execute a sync sqlite op on a worker thread, serialized by lock."""

        def _call() -> Any:
            with self._lock:
                return func(*args)

        return asyncio.to_thread(_call)

    @staticmethod
    def _chunk_table(dimension: int) -> str:
        if dimension == DIM_LOCAL:
            return CHUNKS_LOCAL
        if dimension == DIM_NV:
            return CHUNKS_NV
        raise ValueError(
            f"unsupported embedding dimension {dimension} "
            f"(expected {DIM_LOCAL} or {DIM_NV})"
        )

    # ------------------------------------------------------------------
    # VaultPort: documents
    # ------------------------------------------------------------------

    async def store_document(self, filename: str, status: str = "processing") -> int:
        def _store() -> int:
            conn = self._connect()
            cur = conn.execute(
                "INSERT INTO documents (filename, status) VALUES (?, ?)",
                (filename, status),
            )
            return int(cur.lastrowid or 0)

        return await self._run(_store)

    async def get_document(self, document_id: int) -> Optional[Dict[str, Any]]:
        def _get() -> Optional[Dict[str, Any]]:
            conn = self._connect()
            row = conn.execute(
                "SELECT id, filename, status, is_permanent, chunk_count, "
                "created_at, metadata_json FROM documents WHERE id = ?",
                (document_id,),
            ).fetchone()
            if row is None:
                return None
            return {
                "id": row[0],
                "filename": row[1],
                "status": row[2],
                "is_permanent": bool(row[3]),
                "chunk_count": row[4],
                "created_at": row[5],
                "metadata_json": row[6],
            }

        return await self._run(_get)

    # ------------------------------------------------------------------
    # VaultPort: chunks / vector search
    # ------------------------------------------------------------------

    async def store_chunk(
        self, document_id: int, content: str, embedding: List[float], index: int
    ) -> int:
        def _store() -> int:
            conn = self._connect()
            table = self._chunk_table(len(embedding))
            store = Vec0Store(conn)
            chunk_id = store.insert(
                table,
                content=content,
                embedding=embedding,
                document_id=document_id,
                chunk_index=index,
            )
            conn.execute(
                f"INSERT INTO {_FTS_TABLE} (rowid, vec_table, content) VALUES (?, ?, ?)",
                (_fts_rowid(table, chunk_id), table, content),
            )
            conn.execute(
                "UPDATE documents SET chunk_count = chunk_count + 1 WHERE id = ?",
                (document_id,),
            )
            return chunk_id

        return await self._run(_store)

    async def search_similar(
        self, embedding: List[float], limit: int = 10
    ) -> List[Dict[str, Any]]:
        def _search() -> List[Dict[str, Any]]:
            table = self._chunk_table(len(embedding))
            return Vec0Store(self._connect()).query(table, embedding, k=limit)

        return await self._run(_search)

    # ------------------------------------------------------------------
    # VaultPort: chat history
    # ------------------------------------------------------------------

    async def store_message(
        self,
        document_id: int,
        role: str,
        content: str,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> int:
        def _store() -> int:
            conn = self._connect()
            cur = conn.execute(
                "INSERT INTO chat_messages (document_id, role, content, metrics_json) "
                "VALUES (?, ?, ?, ?)",
                (document_id, role, content, json.dumps(metrics) if metrics else None),
            )
            return int(cur.lastrowid or 0)

        return await self._run(_store)

    async def get_history(
        self, document_id: int, limit: int = 5
    ) -> List[Dict[str, str]]:
        def _history() -> List[Dict[str, str]]:
            conn = self._connect()
            rows = conn.execute(
                "SELECT role, content FROM chat_messages "
                "WHERE document_id = ? ORDER BY id DESC LIMIT ?",
                (document_id, limit),
            ).fetchall()
            return [{"role": r[0], "content": r[1]} for r in reversed(rows)]

        return await self._run(_history)

    # ------------------------------------------------------------------
    # VaultPort: telemetry
    # ------------------------------------------------------------------

    async def get_telemetry(self) -> Dict[str, Any]:
        def _telemetry() -> Dict[str, Any]:
            conn = self._connect()
            documents = conn.execute("SELECT COUNT(*) FROM documents").fetchone()[0]
            messages = conn.execute("SELECT COUNT(*) FROM chat_messages").fetchone()[0]
            chunks = Vec0Store(conn).count(CHUNKS_NV) + Vec0Store(conn).count(CHUNKS_LOCAL)
            return {
                "documents": documents,
                "chunks": chunks,
                "messages": messages,
            }

        return await self._run(_telemetry)

    # ------------------------------------------------------------------
    # VaultPort: vault lifecycle
    # ------------------------------------------------------------------

    async def create_vault(self, slug: str) -> bool:
        _validate_slug(slug)

        def _create() -> bool:
            path = self._vault_dir / f"client_{slug}.db"
            self._vault_dir.mkdir(parents=True, exist_ok=True)
            conn = open_vault_db(str(path))
            conn.close()
            return True

        return await self._run(_create)

    async def list_vaults(self) -> List[str]:
        def _list() -> List[str]:
            if not self._vault_dir.is_dir():
                return []
            slugs = []
            for path in sorted(self._vault_dir.glob("client_*.db")):
                match = _FILE_RE.match(path.name)
                if match:
                    slugs.append(match.group(1))
            return slugs

        return await self._run(_list)

    async def delete_vault(self, slug: str) -> bool:
        _validate_slug(slug)

        def _delete() -> bool:
            base = self._vault_dir / f"client_{slug}.db"
            if not base.exists():
                return False
            for suffix in ("", "-wal", "-shm"):
                path = Path(f"{base}{suffix}")
                if path.exists():
                    path.unlink()
            return True

        return await self._run(_delete)

    # ------------------------------------------------------------------
    # API layer: documents
    # ------------------------------------------------------------------

    async def list_documents(
        self, limit: Optional[int] = 100
    ) -> List[Dict[str, Any]]:
        def _list() -> List[Dict[str, Any]]:
            conn = self._connect()
            if limit is None:
                rows = conn.execute(
                    "SELECT id, filename, status, is_permanent, chunk_count, "
                    "created_at FROM documents ORDER BY id DESC"
                ).fetchall()
            else:
                rows = conn.execute(
                    "SELECT id, filename, status, is_permanent, chunk_count, "
                    "created_at FROM documents ORDER BY id DESC LIMIT ?",
                    (limit,),
                ).fetchall()
            return [
                {
                    "id": r[0],
                    "filename": r[1],
                    "status": r[2],
                    "is_permanent": bool(r[3]),
                    "chunk_count": r[4],
                    "created_at": r[5],
                }
                for r in rows
            ]

        return await self._run(_list)

    async def get_document_by_filename(
        self, filename: str
    ) -> Optional[Dict[str, Any]]:
        def _get() -> Optional[Dict[str, Any]]:
            conn = self._connect()
            row = conn.execute(
                "SELECT id, filename, status, is_permanent, chunk_count, "
                "created_at, metadata_json FROM documents "
                "WHERE filename = ? ORDER BY id DESC LIMIT 1",
                (filename,),
            ).fetchone()
            if row is None:
                return None
            return {
                "id": row[0],
                "filename": row[1],
                "status": row[2],
                "is_permanent": bool(row[3]),
                "chunk_count": row[4],
                "created_at": row[5],
                "metadata_json": row[6],
            }

        return await self._run(_get)

    async def update_document_status(self, document_id: int, status: str) -> bool:
        def _update() -> bool:
            conn = self._connect()
            cur = conn.execute(
                "UPDATE documents SET status = ? WHERE id = ?", (status, document_id)
            )
            return cur.rowcount > 0

        return await self._run(_update)

    async def set_document_permanent(self, filename: str) -> bool:
        def _update() -> bool:
            conn = self._connect()
            cur = conn.execute(
                "UPDATE documents SET is_permanent = 1 WHERE filename = ?",
                (filename,),
            )
            return cur.rowcount > 0

        return await self._run(_update)

    async def delete_document(self, filename: str) -> bool:
        def _delete() -> bool:
            conn = self._connect()
            doc = conn.execute(
                "SELECT id FROM documents WHERE filename = ? ORDER BY id DESC LIMIT 1",
                (filename,),
            ).fetchone()
            if doc is None:
                return False
            doc_id = int(doc[0])
            fts_rows: List[tuple] = []
            for table in (CHUNKS_NV, CHUNKS_LOCAL):
                rows = conn.execute(
                    f"SELECT id, content FROM {table} WHERE document_id = ?",
                    (doc_id,),
                ).fetchall()
                Vec0Store(conn).delete_by_document(table, doc_id)
                fts_rows.extend((_fts_rowid(table, int(r[0])), str(r[1])) for r in rows)
            for fts_id, _content in fts_rows:
                conn.execute(f"DELETE FROM {_FTS_TABLE} WHERE rowid = ?", (fts_id,))
            conn.execute("DELETE FROM chat_messages WHERE document_id = ?", (doc_id,))
            conn.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            return True

        return await self._run(_delete)

    # ------------------------------------------------------------------
    # API layer: hybrid search
    # ------------------------------------------------------------------

    async def search_vault(
        self,
        query_embedding: List[float],
        query_text: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        def _search() -> List[Dict[str, Any]]:
            conn = self._connect()
            table = self._chunk_table(len(query_embedding))
            vec_rows = Vec0Store(conn).query(table, query_embedding, k=limit * 2)

            fts_matches: Dict[tuple, float] = {}
            match_expr = _fts_query(query_text)
            if match_expr:
                fts_rows = conn.execute(
                    f"SELECT rowid, rank FROM {_FTS_TABLE} "
                    "WHERE chunks_fts MATCH ? ORDER BY rank LIMIT ?",
                    (match_expr, limit * 2),
                ).fetchall()
                for fts_id, rank in fts_rows:
                    fts_matches[_fts_decode(int(fts_id))] = float(rank)

            combined: Dict[tuple, Dict[str, Any]] = {}
            for row in vec_rows:
                key = (table, int(row["id"]))
                sim = 1.0 / (1.0 + float(row["distance"]))
                rank = fts_matches.pop(key, 0.0)
                combined[key] = {
                    "id": int(row["id"]),
                    "document_id": int(row["document_id"]),
                    "content": str(row["content"]),
                    "similarity": round(sim, 6),
                    "fts_rank": round(1.0 / (1.0 + rank), 6) if rank else 0.0,
                    "_score": sim + (1.0 / (1.0 + rank) if rank else 0.0),
                }
            for (fts_table, fts_id), rank in fts_matches.items():
                row = conn.execute(
                    f"SELECT id, document_id, content FROM {fts_table} WHERE id = ?",
                    (fts_id,),
                ).fetchone()
                if row is None:
                    continue
                combined[(fts_table, fts_id)] = {
                    "id": fts_id,
                    "document_id": int(row[1]),
                    "content": str(row[2]),
                    "similarity": 0.0,
                    "fts_rank": round(1.0 / (1.0 + rank), 6),
                    "_score": 1.0 / (1.0 + rank),
                }

            ordered = sorted(combined.values(), key=lambda r: r["_score"], reverse=True)[:limit]
            if not ordered:
                return []

            doc_ids = sorted({int(r["document_id"]) for r in ordered})
            placeholders = ",".join("?" * len(doc_ids))
            doc_rows = conn.execute(
                f"SELECT id, filename FROM documents WHERE id IN ({placeholders})",
                doc_ids,
            ).fetchall()
            names = {int(r[0]): str(r[1]) for r in doc_rows}
            return [
                {
                    "id": r["id"],
                    "filename": names.get(int(r["document_id"]), ""),
                    "content": r["content"],
                    "similarity": r["similarity"],
                    "fts_rank": r["fts_rank"],
                }
                for r in ordered
            ]

        return await self._run(_search)

    # ------------------------------------------------------------------
    # API layer: audit logs
    # ------------------------------------------------------------------

    async def store_audit_log(
        self,
        question: str,
        metrics: Optional[Dict[str, Any]] = None,
        latency: float = 0.0,
    ) -> int:
        def _store() -> int:
            conn = self._connect()
            metric_values = metrics or {}
            cur = conn.execute(
                "INSERT INTO audit_logs (question, faithfulness, precision, "
                "relevance, latency) VALUES (?, ?, ?, ?, ?)",
                (
                    question,
                    metric_values.get("faithfulness", 0.0),
                    metric_values.get("precision", 0.0),
                    metric_values.get("relevance", 0.0),
                    latency,
                ),
            )
            return int(cur.lastrowid or 0)

        return await self._run(_store)

    async def list_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        def _list() -> List[Dict[str, Any]]:
            conn = self._connect()
            rows = conn.execute(
                "SELECT id, question, faithfulness, precision, relevance, "
                "latency, created_at FROM audit_logs ORDER BY id DESC LIMIT ?",
                (limit,),
            ).fetchall()
            return [
                {
                    "id": r[0],
                    "question": r[1],
                    "faithfulness": r[2],
                    "precision": r[3],
                    "relevance": r[4],
                    "latency": r[5],
                    "created_at": r[6],
                }
                for r in rows
            ]

        return await self._run(_list)

    # ------------------------------------------------------------------
    # API layer: API keys (hash-only storage, never raw keys)
    # ------------------------------------------------------------------

    async def create_api_key(self, name: str, key_hash: str, key_hint: str) -> int:
        def _create() -> int:
            conn = self._connect()
            cur = conn.execute(
                "INSERT INTO api_keys (key_hash, name, key_hint, is_active) "
                "VALUES (?, ?, ?, 1)",
                (key_hash, name, key_hint),
            )
            return int(cur.lastrowid or 0)

        return await self._run(_create)

    async def list_api_keys(self) -> List[Dict[str, Any]]:
        def _list() -> List[Dict[str, Any]]:
            conn = self._connect()
            rows = conn.execute(
                "SELECT id, name, key_hint, is_active, created_at "
                "FROM api_keys ORDER BY id DESC"
            ).fetchall()
            return [
                {
                    "id": r[0],
                    "name": r[1],
                    "key_hint": r[2],
                    "is_active": bool(r[3]),
                    "created_at": r[4],
                }
                for r in rows
            ]

        return await self._run(_list)

    async def revoke_api_key(self, key_id: str) -> bool:
        def _revoke() -> bool:
            conn = self._connect()
            cur = conn.execute(
                "UPDATE api_keys SET is_active = 0 WHERE id = ? AND is_active = 1",
                (key_id,),
            )
            return cur.rowcount > 0

        return await self._run(_revoke)

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None
