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


class TestListDocuments:
    async def test_newest_first_with_limit(self, vault):
        for i in range(3):
            await vault.store_document(f"doc_{i}.pdf")
        docs = await vault.list_documents(limit=2)
        assert [d["filename"] for d in docs] == ["doc_2.pdf", "doc_1.pdf"]

    async def test_no_limit_returns_all(self, vault):
        for i in range(5):
            await vault.store_document(f"doc_{i}.pdf")
        assert len(await vault.list_documents(limit=None)) == 5


class TestDocumentByFilename:
    async def test_finds_latest_by_filename(self, vault):
        await vault.store_document("contract.pdf", status="processing")
        latest = await vault.store_document("contract.pdf", status="indexed")
        doc = await vault.get_document_by_filename("contract.pdf")
        assert doc["id"] == latest
        assert doc["status"] == "indexed"

    async def test_missing_filename_returns_none(self, vault):
        assert await vault.get_document_by_filename("nope.pdf") is None


class TestDocumentUpdates:
    async def test_update_status(self, vault):
        doc_id = await vault.store_document("a.pdf")
        assert await vault.update_document_status(doc_id, "indexed") is True
        assert (await vault.get_document(doc_id))["status"] == "indexed"

    async def test_update_missing_document_returns_false(self, vault):
        assert await vault.update_document_status(9999, "indexed") is False

    async def test_set_permanent(self, vault):
        await vault.store_document("keep.pdf")
        assert await vault.set_document_permanent("keep.pdf") is True
        doc = await vault.get_document_by_filename("keep.pdf")
        assert doc["is_permanent"] == 1

    async def test_delete_document_removes_chunks_and_messages(self, vault):
        doc_id = await vault.store_document("gone.pdf")
        await vault.store_chunk(doc_id, "confidential data", unit(384, 0), 0)
        await vault.store_message(doc_id, "user", "hello")
        assert await vault.delete_document("gone.pdf") is True
        assert await vault.get_document(doc_id) is None
        assert await vault.search_similar(unit(384, 0), limit=5) == []
        assert await vault.get_history(doc_id, limit=5) == []

    async def test_delete_missing_document_returns_false(self, vault):
        assert await vault.delete_document("never.pdf") is False


class TestHybridSearch:
    async def test_vector_plus_keyword_merge(self, vault):
        doc_id = await vault.store_document("report.pdf")
        await vault.store_chunk(doc_id, "Revenue is growing strongly", unit(384, 0), 0)
        await vault.store_chunk(doc_id, "Costs are flat", unit(384, 1), 1)
        results = await vault.search_vault(unit(384, 0), "revenue", limit=5)
        assert results[0]["content"] == "Revenue is growing strongly"
        assert results[0]["filename"] == "report.pdf"
        assert "similarity" in results[0] and "fts_rank" in results[0]

    async def test_keyword_only_results_included(self, vault):
        doc_id = await vault.store_document("a.pdf")
        await vault.store_chunk(doc_id, "zebra migration patterns", unit(384, 0), 0)
        await vault.store_chunk(doc_id, "tax depreciation schedules", unit(384, 1), 1)
        results = await vault.search_vault(unit(384, 0), "depreciation", limit=5)
        contents = [r["content"] for r in results]
        assert "tax depreciation schedules" in contents

    async def test_keyword_boost_ranks_above_vector_only(self, vault):
        doc_id = await vault.store_document("a.pdf")
        await vault.store_chunk(doc_id, "revenue recognized quarterly", unit(384, 1), 0)
        await vault.store_chunk(doc_id, "tax depreciation schedules", unit(384, 0), 1)
        # Query vector is closest to chunk 1 (unit 0), but the keyword matches
        # chunk 0 — hybrid merge must rank the keyword-boosted chunk first.
        results = await vault.search_vault(unit(384, 0), "revenue", limit=5)
        assert results[0]["content"] == "revenue recognized quarterly"
        assert results[0]["fts_rank"] > 0.0

    async def test_vector_result_kept_without_keyword_match(self, vault):
        doc_id = await vault.store_document("a.pdf")
        await vault.store_chunk(doc_id, "nothing relevant here", unit(384, 0), 0)
        results = await vault.search_vault(unit(384, 0), "xylophone", limit=5)
        assert len(results) == 1
        assert results[0]["content"] == "nothing relevant here"
        assert results[0]["fts_rank"] == 0.0


class TestAuditLogs:
    async def test_store_and_list(self, vault):
        await vault.store_audit_log("q1", {"faithfulness": 0.9}, 1.5)
        await vault.store_audit_log("q2", {"faithfulness": 0.7}, 2.0)
        logs = await vault.list_audit_logs(limit=5)
        assert [l["question"] for l in logs] == ["q2", "q1"]
        assert logs[0]["latency"] == 2.0


class TestApiKeys:
    async def test_create_list_revoke(self, vault):
        key_id = await vault.create_api_key("ci", "hash1", "axm_live_1234...")
        keys = await vault.list_api_keys()
        assert keys[0]["id"] == key_id
        assert keys[0]["name"] == "ci"
        assert await vault.revoke_api_key(str(key_id)) is True
        keys = await vault.list_api_keys()
        assert keys[0]["is_active"] is False

    async def test_revoke_missing_key_returns_false(self, vault):
        assert await vault.revoke_api_key("9999") is False
