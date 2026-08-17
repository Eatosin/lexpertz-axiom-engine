"""Integration tests for the migrated SiaS endpoints (Phase 1b).

Endpoints run against a real SQLite vault in a temp dir with embeddings
mocked to a unit 1024-d vector (no network). Auth is overridden.
"""

import json

import pytest
from fastapi.testclient import TestClient

FIXTURE_PDF = "tests/fixtures/sample_audit.pdf"


@pytest.fixture
def client(tmp_path, monkeypatch):
    import app.core.axiom_paths as ap

    monkeypatch.setattr(ap, "VAULTS_DIR", tmp_path / "vaults")
    monkeypatch.setattr(ap, "get_vault_dir", lambda: ap.VAULTS_DIR)

    def fake_embedding(text, input_type="query"):
        v = [0.0] * 1024
        v[0] = 1.0
        return v

    import app.api.ingest
    import app.api.vault

    monkeypatch.setattr(app.api.ingest, "get_embedding", fake_embedding)
    monkeypatch.setattr(app.api.vault, "get_embedding", fake_embedding)
    monkeypatch.setattr("app.core.embeddings.get_embedding", fake_embedding)

    from app.main import app
    from app.core.auth import get_current_user

    async def fake_user():
        return "test-user"

    app.dependency_overrides[get_current_user] = fake_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


class TestIngestFlow:
    def test_upload_indexes_document(self, client):
        with open(FIXTURE_PDF, "rb") as fh:
            response = client.post(
                "/api/v1/upload",
                files={"file": ("sample_audit.pdf", fh, "application/pdf")},
            )
        assert response.status_code == 200
        assert response.json()["status"] == "queued"

        status = client.get("/api/v1/status/sample_audit.pdf").json()
        assert status["status"] == "indexed"

        metadata = client.get("/api/v1/metadata/sample_audit.pdf").json()
        assert metadata["chunk_count"] > 0

        latest = client.get("/api/v1/latest").json()
        assert latest["filename"] == "sample_audit.pdf"

        telemetry = client.get("/api/v1/telemetry").json()
        assert int(telemetry["chunks"]) > 0

    def test_upload_rejects_unsupported_type(self, client):
        response = client.post(
            "/api/v1/upload",
            files={"file": ("evil.exe", b"MZ", "application/octet-stream")},
        )
        assert response.status_code == 400

    def test_save_and_delete_document(self, client):
        with open(FIXTURE_PDF, "rb") as fh:
            client.post(
                "/api/v1/upload",
                files={"file": ("sample_audit.pdf", fh, "application/pdf")},
            )
        assert client.post("/api/v1/save", json={"filename": "sample_audit.pdf"}).json()["status"] == "persisted"
        delete_resp = client.delete("/api/v1/documents/sample_audit.pdf")
        assert delete_resp.json()["status"] == "purged"
        assert client.get("/api/v1/status/sample_audit.pdf").json()["status"] == "not_found"


class TestVaultSearch:
    def test_hybrid_search_returns_results(self, client):
        with open(FIXTURE_PDF, "rb") as fh:
            client.post(
                "/api/v1/upload",
                files={"file": ("sample_audit.pdf", fh, "application/pdf")},
            )
        response = client.post(
            "/api/v1/vault/search", json={"query": "balance", "limit": 5}
        )
        assert response.status_code == 200
        results = response.json()
        assert results
        for key in ("id", "filename", "content", "similarity", "fts_rank"):
            assert key in results[0]
        assert results[0]["filename"] == "sample_audit.pdf"


class TestHistory:
    def test_documents_and_chat_history(self, client):
        with open(FIXTURE_PDF, "rb") as fh:
            client.post(
                "/api/v1/upload",
                files={"file": ("sample_audit.pdf", fh, "application/pdf")},
            )
        docs = client.get("/api/v1/documents").json()
        assert any(d["filename"] == "sample_audit.pdf" for d in docs)

        chat = client.get("/api/v1/chat/sample_audit.pdf").json()
        assert chat == []


class TestVerifyFlow:
    def test_verify_streams_and_persists(self, client, monkeypatch):
        with open(FIXTURE_PDF, "rb") as fh:
            client.post(
                "/api/v1/upload",
                files={"file": ("sample_audit.pdf", fh, "application/pdf")},
            )

        async def _empty_stream(*args, **kwargs):
            if False:
                yield None

        import app.api.run

        monkeypatch.setattr(
            app.api.run,
            "app_graph",
            type("FakeGraph", (), {"astream_events": _empty_stream})(),
        )

        with client.stream(
            "POST",
            "/api/v1/verify",
            json={"question": "What is the liability?", "filenames": ["sample_audit.pdf"]},
        ) as response:
            assert response.status_code == 200
            body = "".join(response.iter_text())

        assert "Verification Failed" in body
        assert "audit_complete" in body

        chat = client.get("/api/v1/chat/sample_audit.pdf").json()
        assert len(chat) == 2
        assert chat[0]["role"] == "user"
        assert chat[1]["role"] == "assistant"

        telemetry = client.get("/api/v1/telemetry").json()
        assert telemetry["ragas"]["faithfulness"] >= 0.0


class TestApiKeys:
    def test_key_crud(self, client):
        created = client.post("/api/v1/keys/", json={"name": "ci-runner"})
        assert created.status_code == 200
        key_value = created.json()["key_value"]
        assert key_value.startswith("axm_live_")

        listed = client.get("/api/v1/keys/").json()
        assert listed["keys"][0]["name"] == "ci-runner"

        key_id = listed["keys"][0]["id"]
        revoked = client.delete(f"/api/v1/keys/{key_id}")
        assert revoked.json()["status"] == "revoked"

        after = client.get("/api/v1/keys/").json()
        assert after["keys"][0]["is_active"] is False


class TestHealth:
    def test_health_operational(self, client):
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "operational"
