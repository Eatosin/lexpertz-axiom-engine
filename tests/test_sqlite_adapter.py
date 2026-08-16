"""Contract tests for SqliteVaultAdapter (Phase 1a, PRD tasks 1.2 + 1.10).

Mirrors the VaultPort contract tests from test_vault_port.py against the
real SQLite implementation, plus multi-vault isolation and concurrency.
"""

import asyncio
from pathlib import Path

import pytest

from app.core.sqlite_adapter import SqliteVaultAdapter


def unit(dim: int, at: int = 0) -> list:
    """Unit vector of ``dim`` dimensions with a 1.0 at position ``at``."""
    v = [0.0] * dim
    v[at] = 1.0
    return v


@pytest.fixture
def vault_dir(tmp_path) -> Path:
    return tmp_path / "vaults"


@pytest.fixture
def vault(vault_dir) -> SqliteVaultAdapter:
    adapter = SqliteVaultAdapter(vault_dir, slug="acme")
    return adapter


class TestDocumentCrud:
    async def test_store_and_get_document(self, vault):
        doc_id = await vault.store_document("contract.pdf")
        doc = await vault.get_document(doc_id)
        assert doc["filename"] == "contract.pdf"
        assert doc["status"] == "processing"

    async def test_store_document_explicit_status(self, vault):
        doc_id = await vault.store_document("invoice.pdf", status="done")
        doc = await vault.get_document(doc_id)
        assert doc["status"] == "done"

    async def test_missing_document_returns_none(self, vault):
        assert await vault.get_document(9999) is None


class TestChunkSearch:
    async def test_search_returns_ranked_results(self, vault):
        doc_id = await vault.store_document("report.pdf")
        await vault.store_chunk(doc_id, "Revenue is growing", unit(384, 0), 0)
        await vault.store_chunk(doc_id, "Costs are flat", unit(384, 1), 1)
        query = [0.95, 0.05] + [0.0] * 382
        results = await vault.search_similar(query, limit=10)
        assert len(results) == 2
        assert results[0]["content"] == "Revenue is growing"
        assert "distance" in results[0]

    async def test_search_routes_384_dimension(self, vault):
        doc_id = await vault.store_document("local.pdf")
        await vault.store_chunk(doc_id, "local chunk", [1.0] + [0.0] * 383, 0)
        results = await vault.search_similar([1.0] + [0.0] * 383, limit=5)
        assert len(results) == 1
        assert results[0]["content"] == "local chunk"

    async def test_search_routes_1024_dimension(self, vault):
        doc_id = await vault.store_document("nv.pdf")
        await vault.store_chunk(doc_id, "cloud chunk", [1.0] + [0.0] * 1023, 0)
        results = await vault.search_similar([1.0] + [0.0] * 1023, limit=5)
        assert len(results) == 1
        assert results[0]["content"] == "cloud chunk"

    async def test_unsupported_dimension_raises(self, vault):
        doc_id = await vault.store_document("bad.pdf")
        with pytest.raises(ValueError):
            await vault.store_chunk(doc_id, "weird", [0.1] * 512, 0)

    async def test_empty_vault_search(self, vault):
        assert await vault.search_similar(unit(384, 0), limit=5) == []


class TestHistory:
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

    async def test_history_isolation_between_documents(self, vault):
        doc_a = await vault.store_document("a.pdf")
        doc_b = await vault.store_document("b.pdf")
        await vault.store_message(doc_a, "user", "only in a")
        history = await vault.get_history(doc_b, limit=5)
        assert history == []


class TestTelemetry:
    async def test_telemetry_counts(self, vault):
        doc_id = await vault.store_document("a.pdf")
        await vault.store_chunk(doc_id, "c1", unit(384, 0), 0)
        await vault.store_message(doc_id, "user", "q")
        telemetry = await vault.get_telemetry()
        assert telemetry["documents"] == 1
        assert telemetry["chunks"] == 1
        assert telemetry["messages"] == 1


class TestVaultCrud:
    async def test_create_vault_creates_db_file(self, vault_dir):
        vault = SqliteVaultAdapter(vault_dir, slug="acme")
        assert await vault.create_vault("acme") is True
        assert (vault_dir / "client_acme.db").exists()

    async def test_list_vaults(self, vault_dir):
        await SqliteVaultAdapter(vault_dir, slug="a").create_vault("a")
        await SqliteVaultAdapter(vault_dir, slug="b").create_vault("b")
        assert sorted(await SqliteVaultAdapter(vault_dir, slug="a").list_vaults()) == ["a", "b"]

    async def test_delete_vault_removes_file(self, vault_dir):
        adapter = SqliteVaultAdapter(vault_dir, slug="gone")
        await adapter.create_vault("gone")
        assert await adapter.delete_vault("gone") is True
        assert not (vault_dir / "client_gone.db").exists()

    async def test_delete_missing_vault_returns_false(self, vault_dir):
        assert await SqliteVaultAdapter(vault_dir, slug="x").delete_vault("nope") is False


class TestIsolation:
    async def test_vaults_are_isolated(self, vault_dir):
        acme = SqliteVaultAdapter(vault_dir, slug="acme")
        beta = SqliteVaultAdapter(vault_dir, slug="beta")
        await acme.create_vault("acme")
        await beta.create_vault("beta")
        doc_id = await acme.store_document("secret.pdf")
        await acme.store_chunk(doc_id, "confidential", unit(384, 0), 0)
        assert await beta.search_similar(unit(384, 0), limit=5) == []
        assert await beta.get_document(doc_id) is None


class TestConcurrency:
    async def test_parallel_document_inserts_get_unique_ids(self, vault):
        ids = await asyncio.gather(*(vault.store_document(f"doc_{i}.pdf") for i in range(20)))
        assert len(set(ids)) == 20

    async def test_parallel_chunk_inserts_all_persisted(self, vault):
        doc_id = await vault.store_document("big.pdf")
        await asyncio.gather(
            *(vault.store_chunk(doc_id, f"chunk {i}", unit(384, 0), i) for i in range(15))
        )
        results = await vault.search_similar(unit(384, 0), limit=20)
        assert len(results) == 15


class TestValidation:
    def test_slug_traversal_rejected(self, vault_dir):
        with pytest.raises(ValueError):
            SqliteVaultAdapter(vault_dir, slug="../evil")
