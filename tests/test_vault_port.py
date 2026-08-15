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
        self._next_id = 1

    async def store_document(self, filename: str, status: str = "processing") -> int:
        doc_id = self._next_id
        self._next_id += 1
        self._documents[doc_id] = {"filename": filename, "status": status}
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
        for method in ("store_document", "get_document", "search_similar", "store_chunk",
                       "store_message", "get_history", "get_telemetry",
                       "create_vault", "list_vaults", "delete_vault"):
            assert callable(getattr(fake, method)), f"VaultPort contract missing {method}"
