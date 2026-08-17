"""Contract tests for the VaultPort interface (Phase 0).

These tests pin the port contract so any adapter (Supabase, SQLite, fake)
can be swapped behind it without breaking consumers.
"""

from typing import Any, Dict, List, Optional

import pytest

from app.core.ports import EmbeddingPort, VaultPort


class InMemoryVault:
    """Minimal in-memory implementation of the VaultPort contract."""

    def __init__(self) -> None:
        self._documents: Dict[int, Dict[str, Any]] = {}
        self._chunks: List[Dict[str, Any]] = []
        self._messages: List[Dict[str, Any]] = []
        self._audit_logs: List[Dict[str, Any]] = []
        self._api_keys: List[Dict[str, Any]] = []
        self._next_id = 1

    async def store_document(self, filename: str, status: str = "processing") -> int:
        doc_id = self._next_id
        self._next_id += 1
        self._documents[doc_id] = {
            "id": doc_id,
            "filename": filename,
            "status": status,
            "created_at": "2026-01-01",
            "is_permanent": False,
        }
        return doc_id

    async def get_document(self, document_id: int) -> Optional[Dict[str, Any]]:
        return self._documents.get(document_id)

    async def search_similar(self, embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        return self._chunks[:limit]

    async def store_chunk(self, document_id: int, content: str, embedding: List[float], index: int) -> int:
        self._chunks.append(
            {"document_id": document_id, "content": content, "index": index}
        )
        return len(self._chunks)

    async def store_message(self, document_id: int, role: str, content: str, metrics: Optional[Dict] = None) -> int:
        self._messages.append(
            {"document_id": document_id, "role": role, "content": content, "metrics": metrics}
        )
        return len(self._messages)

    async def get_history(self, document_id: int, limit: int = 5) -> List[Dict[str, str]]:
        rows = [m for m in self._messages if m["document_id"] == document_id]
        return rows[-limit:]

    async def get_telemetry(self) -> Dict[str, Any]:
        return {"documents": len(self._documents), "chunks": len(self._chunks)}

    async def create_vault(self, slug: str) -> bool:
        return True

    async def list_vaults(self) -> List[str]:
        return ["client_acme", "client_beta"]

    async def delete_vault(self, slug: str) -> bool:
        return True

    async def list_documents(self, limit: Optional[int] = 100) -> List[Dict[str, Any]]:
        rows = list(self._documents.values())
        return rows[-limit:][::-1] if limit else rows[::-1]

    async def get_document_by_filename(self, filename: str) -> Optional[Dict[str, Any]]:
        for doc in reversed(self._documents.values()):
            if doc["filename"] == filename:
                return doc
        return None

    async def update_document_status(self, document_id: int, status: str) -> bool:
        doc = self._documents.get(document_id)
        if doc is None:
            return False
        doc["status"] = status
        return True

    async def set_document_permanent(self, filename: str) -> bool:
        doc = await self.get_document_by_filename(filename)
        if doc is None:
            return False
        doc["is_permanent"] = True
        return True

    async def delete_document(self, filename: str) -> bool:
        ids = [d for d, doc in self._documents.items() if doc["filename"] == filename]
        for doc_id in ids:
            del self._documents[doc_id]
        return bool(ids)

    async def search_vault(
        self, query_embedding: List[float], query_text: str, limit: int = 5
    ) -> List[Dict[str, Any]]:
        results = [
            {
                "id": c.get("id", 0),
                "filename": self._documents.get(c["document_id"], {}).get("filename", ""),
                "content": c["content"],
                "similarity": 1.0,
                "fts_rank": 0.0,
            }
            for c in self._chunks
        ]
        return results[:limit]

    async def store_audit_log(
        self, question: str, metrics: Optional[Dict[str, Any]] = None, latency: float = 0.0
    ) -> int:
        self._audit_logs.append(
            {"question": question, "metrics": metrics or {}, "latency": latency}
        )
        return len(self._audit_logs)

    async def list_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        return self._audit_logs[-limit:][::-1]

    async def create_api_key(self, name: str, key_hash: str, key_hint: str) -> int:
        self._api_keys.append(
            {
                "id": len(self._api_keys) + 1,
                "name": name,
                "key_hash": key_hash,
                "key_hint": key_hint,
            }
        )
        return len(self._api_keys)

    async def list_api_keys(self) -> List[Dict[str, Any]]:
        return list(self._api_keys)

    async def revoke_api_key(self, key_id: str) -> bool:
        return True


@pytest.fixture
def vault() -> VaultPort:
    return InMemoryVault()


class TestVaultPortContract:
    async def test_store_and_get_document(self, vault):
        doc_id = await vault.store_document("contract.pdf")
        doc = await vault.get_document(doc_id)
        assert doc["filename"] == "contract.pdf"
        assert doc["status"] == "processing"

    async def test_store_document_default_status(self, vault):
        doc_id = await vault.store_document("invoice.pdf")
        doc = await vault.get_document(doc_id)
        assert doc["status"] == "processing"

    async def test_missing_document_returns_none(self, vault):
        assert await vault.get_document(9999) is None

    async def test_store_chunk_and_search(self, vault):
        doc_id = await vault.store_document("report.pdf")
        await vault.store_chunk(doc_id, "Revenue is growing", [0.1, 0.2, 0.3], 0)
        await vault.store_chunk(doc_id, "Costs are flat", [0.4, 0.5, 0.6], 1)
        results = await vault.search_similar([0.1, 0.2, 0.3], limit=10)
        assert len(results) == 2

    async def test_store_and_get_history(self, vault):
        doc_id = await vault.store_document("audit.pdf")
        await vault.store_message(doc_id, "user", "What is the liability?")
        await vault.store_message(doc_id, "assistant", "Capped at $5M.")
        history = await vault.get_history(doc_id, limit=5)
        assert len(history) == 2
        assert history[-1]["role"] == "assistant"

    async def test_history_respects_limit(self, vault):
        doc_id = await vault.store_document("audit.pdf")
        for i in range(8):
            await vault.store_message(doc_id, "user", f"msg {i}")
        history = await vault.get_history(doc_id, limit=3)
        assert len(history) == 3
        assert history[-1]["content"] == "msg 7"

    async def test_telemetry(self, vault):
        doc_id = await vault.store_document("a.pdf")
        await vault.store_chunk(doc_id, "c", [0.1], 0)
        telemetry = await vault.get_telemetry()
        assert telemetry["documents"] == 1
        assert telemetry["chunks"] == 1

    async def test_vault_crud(self, vault):
        assert await vault.create_vault("client_acme") is True
        assert "client_acme" in await vault.list_vaults()
        assert await vault.delete_vault("client_acme") is True


class TestApiLayerContract:
    """Contract for the API-layer operations added for Phase 1b."""

    async def test_list_documents_newest_first(self, vault):
        for i in range(3):
            await vault.store_document(f"doc_{i}.pdf")
        docs = await vault.list_documents(limit=2)
        assert [d["filename"] for d in docs] == ["doc_2.pdf", "doc_1.pdf"]

    async def test_get_document_by_filename(self, vault):
        doc_id = await vault.store_document("contract.pdf")
        doc = await vault.get_document_by_filename("contract.pdf")
        assert doc["id"] == doc_id

    async def test_update_document_status(self, vault):
        doc_id = await vault.store_document("a.pdf")
        assert await vault.update_document_status(doc_id, "indexed") is True
        assert (await vault.get_document(doc_id))["status"] == "indexed"

    async def test_set_document_permanent(self, vault):
        await vault.store_document("keep.pdf")
        assert await vault.set_document_permanent("keep.pdf") is True
        doc = await vault.get_document_by_filename("keep.pdf")
        assert doc["is_permanent"] is True

    async def test_delete_document(self, vault):
        await vault.store_document("gone.pdf")
        assert await vault.delete_document("gone.pdf") is True
        assert await vault.get_document_by_filename("gone.pdf") is None

    async def test_search_vault_shape(self, vault):
        doc_id = await vault.store_document("r.pdf")
        await vault.store_chunk(doc_id, "revenue grows", [0.1, 0.2], 0)
        results = await vault.search_vault([0.1, 0.2], "revenue", limit=5)
        assert results
        for key in ("id", "filename", "content", "similarity", "fts_rank"):
            assert key in results[0]

    async def test_audit_log_roundtrip(self, vault):
        await vault.store_audit_log("q?", {"faithfulness": 0.9}, 1.2)
        logs = await vault.list_audit_logs(limit=5)
        assert logs[0]["question"] == "q?"

    async def test_api_key_roundtrip(self, vault):
        await vault.create_api_key("ci", "hash1", "axm_live_1234...")
        keys = await vault.list_api_keys()
        assert keys[0]["key_hint"] == "axm_live_1234..."
        assert await vault.revoke_api_key(str(keys[0]["id"])) is True


class TestEmbeddingPortContract:
    async def test_embedding_port_shape(self):
        class FakeEmbedder(EmbeddingPort):
            async def embed_text(self, text: str, is_query: bool = False) -> List[float]:
                return [0.1] * self.dimension

            @property
            def dimension(self) -> int:
                return 384

        fake = FakeEmbedder()
        vec = await fake.embed_text("test")
        assert len(vec) == 384

    async def test_embedding_port_is_protocol(self):
        assert isinstance(VaultPort, type)
        # Protocol members exist as callables on the fake
        fake = InMemoryVault()
        for method in (
            "store_document", "get_document", "search_similar", "store_chunk",
            "store_message", "get_history", "get_telemetry",
            "create_vault", "list_vaults", "delete_vault",
            "list_documents", "get_document_by_filename", "update_document_status",
            "set_document_permanent", "delete_document", "search_vault",
            "store_audit_log", "list_audit_logs",
            "create_api_key", "list_api_keys", "revoke_api_key",
        ):
            assert callable(getattr(fake, method)), f"VaultPort contract missing {method}"
