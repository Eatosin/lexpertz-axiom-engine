"""Supabase vault adapter — implements ``VaultPort`` over the existing
Supabase client (Phase 0).

This preserves the current storage behavior so existing endpoints
(``ingest.py``, ``run.py``, ``vault.py``) keep working during migration.
A feature flag in ``SiaSConfig`` selects this adapter vs ``SqliteVaultAdapter``.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional

from app.core.database import db
from app.core.ports import VaultPort


class SupabaseVaultAdapter:
    """Implements the VaultPort contract against Supabase.

    ``db`` may be ``None`` when credentials are missing — every method then
    raises ``RuntimeError`` so failures are loud, never silently swallowed.
    """

    def __init__(self, client: Any = None) -> None:
        self._client = client if client is not None else db

    def _require_client(self) -> Any:
        if self._client is None:
            raise RuntimeError("Vault database offline (Supabase credentials missing).")
        return self._client

    async def store_document(self, filename: str, status: str = "processing") -> int:
        client = self._require_client()

        def _insert() -> int:
            res = client.table("documents").insert(
                {"filename": filename, "status": status, "is_permanent": False}
            ).execute()
            data = res.data or []
            return int(data[0]["id"]) if data else 0

        doc_id = await asyncio.to_thread(_insert)
        if not doc_id:
            raise RuntimeError("Failed to register document in vault.")
        return doc_id

    async def get_document(self, document_id: int) -> Optional[Dict[str, Any]]:
        client = self._require_client()

        def _fetch() -> Optional[Dict[str, Any]]:
            res = client.table("documents").select("*").eq("id", document_id).execute()
            data = res.data or []
            return data[0] if data else None

        return await asyncio.to_thread(_fetch)

    async def search_similar(
        self, embedding: List[float], limit: int = 10
    ) -> List[Dict[str, Any]]:
        client = self._require_client()

        def _search() -> List[Dict[str, Any]]:
            res = client.rpc("match_document_chunks", {"query_embedding": embedding, "match_count": limit}).execute()
            return res.data or []

        return await asyncio.to_thread(_search)

    async def store_chunk(
        self, document_id: int, content: str, embedding: List[float], index: int
    ) -> int:
        client = self._require_client()

        def _insert() -> int:
            res = client.table("document_chunks").insert(
                {
                    "document_id": document_id,
                    "content": content,
                    "embedding": embedding,
                    "metadata": {"index": index},
                }
            ).execute()
            data = res.data or []
            return int(data[0]["id"]) if data else 0

        chunk_id = await asyncio.to_thread(_insert)
        if not chunk_id:
            raise RuntimeError("Failed to store chunk in vault.")
        return chunk_id

    async def store_message(
        self,
        document_id: int,
        role: str,
        content: str,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> int:
        client = self._require_client()

        def _insert() -> int:
            res = client.table("chat_messages").insert(
                {"document_id": document_id, "role": role, "content": content, "metrics_json": metrics}
            ).execute()
            data = res.data or []
            return int(data[0]["id"]) if data else 0

        msg_id = await asyncio.to_thread(_insert)
        if not msg_id:
            raise RuntimeError("Failed to store message in vault.")
        return msg_id

    async def get_history(
        self, document_id: int, limit: int = 5
    ) -> List[Dict[str, str]]:
        client = self._require_client()

        def _fetch() -> List[Dict[str, str]]:
            res = (
                client.table("chat_messages")
                .select("role, content")
                .eq("document_id", document_id)
                .order("id", desc=True)
                .limit(limit)
                .execute()
            )
            data = res.data or []
            return list(reversed([{"role": r["role"], "content": r["content"]} for r in data]))

        return await asyncio.to_thread(_fetch)

    async def get_telemetry(self) -> Dict[str, Any]:
        client = self._require_client()

        def _count() -> Dict[str, Any]:
            docs = client.table("documents").select("id", count="exact").execute()
            chunks = client.table("document_chunks").select("id", count="exact").execute()
            return {"documents": docs.count or 0, "chunks": chunks.count or 0}

        return await asyncio.to_thread(_count)

    async def create_vault(self, slug: str) -> bool:
        # Supabase SaaS uses a single shared vault; per-client isolation is a
        # SQLite multi-vault concern (Phase 1). No-op success here.
        self._require_client()
        return True

    async def list_vaults(self) -> List[str]:
        self._require_client()
        return ["default"]

    async def delete_vault(self, slug: str) -> bool:
        self._require_client()
        return True
