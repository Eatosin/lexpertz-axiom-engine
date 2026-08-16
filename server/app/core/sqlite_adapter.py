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

DIM_LOCAL = 384
DIM_NV = 1024


class SqliteVaultAdapter:
    """VaultPort implementation backed by per-client SQLite files."""

    def __init__(self, vault_dir: Path, slug: str = "default") -> None:
        self._vault_dir = Path(vault_dir)
        self._slug = self._validate_slug(slug)
        self._db_path = self._vault_dir / f"client_{self._slug}.db"
        self._lock = threading.RLock()
        self._conn: Optional[sqlite3.Connection] = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _validate_slug(slug: str) -> str:
        if not _SLUG_RE.match(slug):
            raise ValueError(
                f"invalid vault slug {slug!r}: only [a-z0-9_-] allowed"
            )
        return slug

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
            return int(cur.lastrowid)

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
            table = self._chunk_table(len(embedding))
            store = Vec0Store(self._connect())
            chunk_id = store.insert(
                table,
                content=content,
                embedding=embedding,
                document_id=document_id,
                chunk_index=index,
            )
            self._connect().execute(
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
            return int(cur.lastrowid)

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
        self._validate_slug(slug)

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
        self._validate_slug(slug)

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
    # Lifecycle
    # ------------------------------------------------------------------

    def close(self) -> None:
        if self._conn is not None:
            self._conn.close()
            self._conn = None
