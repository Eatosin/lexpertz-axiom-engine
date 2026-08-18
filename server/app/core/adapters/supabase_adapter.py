"""Supabase vault adapter — implements ``VaultPort`` over the existing
Supabase client (Phase 0).

This preserves the current storage behavior so existing endpoints
(``ingest.py``, ``run.py``, ``vault.py``) keep working during migration.
A feature flag in ``SiaSConfig`` selects this adapter vs ``SqliteVaultAdapter``.
"""

from __future__ import annotations

import asyncio
from typing import Any, Dict, List, Optional, cast

from app.core.database import db
from app.core.ports import VaultPort


class SupabaseVaultAdapter:
    """Implements the VaultPort contract against Supabase.

    ``db`` may be ``None`` when credentials are missing — every method then
    raises ``RuntimeError`` so failures are loud, never silently swallowed.
    """

    def __init__(self, client: Any = None, user_id: str = "default") -> None:
        self._client = client if client is not None else db
        self._target_user_id = user_id

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

    # ------------------------------------------------------------------
    # API layer: documents
    # ------------------------------------------------------------------

    async def list_documents(self, limit: Optional[int] = 100) -> List[Dict[str, Any]]:
        client = self._require_client()

        def _fetch() -> List[Dict[str, Any]]:
            query = (
                client.table("documents")
                .select("id, filename, status, is_permanent, chunk_count, created_at")
                .order("created_at", desc=True)
            )
            if limit is not None:
                query = query.limit(limit)
            res = query.execute()
            return cast(List[Dict[str, Any]], res.data)

        return await asyncio.to_thread(_fetch)

    async def get_document_by_filename(self, filename: str) -> Optional[Dict[str, Any]]:
        client = self._require_client()

        def _fetch() -> Optional[Dict[str, Any]]:
            res = (
                client.table("documents")
                .select("*")
                .eq("filename", filename)
                .order("created_at", desc=True)
                .limit(1)
                .execute()
            )
            data = res.data or []
            return data[0] if data else None

        return await asyncio.to_thread(_fetch)

    async def update_document_status(self, document_id: int, status: str) -> bool:
        client = self._require_client()

        def _update() -> bool:
            res = (
                client.table("documents")
                .update({"status": status})
                .eq("id", document_id)
                .execute()
            )
            return bool(res.data)

        return await asyncio.to_thread(_update)

    async def set_document_permanent(self, filename: str) -> bool:
        client = self._require_client()

        def _update() -> bool:
            res = (
                client.table("documents")
                .update({"is_permanent": True})
                .eq("filename", filename)
                .execute()
            )
            return bool(res.data)

        return await asyncio.to_thread(_update)

    async def delete_document(self, filename: str) -> bool:
        client = self._require_client()

        def _delete() -> bool:
            doc_res = (
                client.table("documents")
                .select("id")
                .eq("filename", filename)
                .execute()
            )
            doc_data = cast(List[Dict[str, Any]], doc_res.data)
            if not doc_data:
                return False
            for doc in doc_data:
                client.table("document_chunks").delete().eq("document_id", doc["id"]).execute()
                client.table("chat_messages").delete().eq("document_id", doc["id"]).execute()
                client.table("documents").delete().eq("id", doc["id"]).execute()
            return True

        return await asyncio.to_thread(_delete)

    # ------------------------------------------------------------------
    # API layer: hybrid search (existing Postgres hybrid_vault_search RPC)
    # ------------------------------------------------------------------

    async def search_vault(
        self,
        query_embedding: List[float],
        query_text: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        client = self._require_client()

        def _search() -> List[Dict[str, Any]]:
            res = client.rpc(
                "hybrid_vault_search",
                {
                    "query_text": query_text,
                    "query_embedding": query_embedding,
                    "match_count": limit,
                    "target_user_id": self._target_user_id,
                },
            ).execute()
            return cast(List[Dict[str, Any]], res.data)

        return await asyncio.to_thread(_search)

    # ------------------------------------------------------------------
    # API layer: audit logs
    # ------------------------------------------------------------------

    async def store_audit_log(
        self,
        question: str,
        metrics: Optional[Dict[str, Any]] = None,
        latency: float = 0.0,
    ) -> int:
        client = self._require_client()
        metric_values = metrics or {}

        def _insert() -> int:
            res = client.table("audit_logs").insert(
                {
                    "question": question,
                    "faithfulness": metric_values.get("faithfulness", 0.0),
                    "precision": metric_values.get("precision", 0.0),
                    "relevance": metric_values.get("relevance", 0.0),
                    "latency": latency,
                }
            ).execute()
            data = res.data or []
            return int(data[0]["id"]) if data else 0

        msg_id = await asyncio.to_thread(_insert)
        if not msg_id:
            raise RuntimeError("Failed to store audit log.")
        return msg_id

    async def list_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        client = self._require_client()

        def _fetch() -> List[Dict[str, Any]]:
            res = (
                client.table("audit_logs")
                .select("id, question, faithfulness, precision, relevance, latency, created_at")
                .order("created_at", desc=True)
                .limit(limit)
                .execute()
            )
            return cast(List[Dict[str, Any]], res.data)

        return await asyncio.to_thread(_fetch)

    # ------------------------------------------------------------------
    # API layer: API keys
    # ------------------------------------------------------------------

    async def create_api_key(self, name: str, key_hash: str, key_hint: str) -> int:
        client = self._require_client()

        def _insert() -> int:
            res = client.table("api_keys").insert(
                {"name": name, "key_value": key_hash, "key_hint": key_hint}
            ).execute()
            data = res.data or []
            return int(data[0]["id"]) if data else 0

        key_id = await asyncio.to_thread(_insert)
        if not key_id:
            raise RuntimeError("Failed to create API key.")
        return key_id

    async def list_api_keys(self) -> List[Dict[str, Any]]:
        client = self._require_client()

        def _fetch() -> List[Dict[str, Any]]:
            res = (
                client.table("api_keys")
                .select("id, name, key_hint, is_active, created_at")
                .order("created_at", desc=True)
                .execute()
            )
            return cast(List[Dict[str, Any]], res.data)

        return await asyncio.to_thread(_fetch)

    async def revoke_api_key(self, key_id: str) -> bool:
        client = self._require_client()

        def _revoke() -> bool:
            res = (
                client.table("api_keys")
                .update({"is_active": False})
                .eq("id", key_id)
                .execute()
            )
            return bool(res.data)

        return await asyncio.to_thread(_revoke)
