"""Tests for SQLite vault backup/restore via the sqlite3 backup API (PRD 1.9)."""

from pathlib import Path

import pytest

from app.core.sqlite_adapter import SqliteVaultAdapter
from app.core.vault_backup import backup_vault, restore_vault


def unit(dim: int, at: int = 0) -> list:
    v = [0.0] * dim
    v[at] = 1.0
    return v


@pytest.fixture
def vault_dir(tmp_path) -> Path:
    return tmp_path / "vaults"


class TestBackup:
    async def test_backup_creates_file(self, vault_dir, tmp_path):
        adapter = SqliteVaultAdapter(vault_dir, slug="acme")
        await adapter.create_vault("acme")
        dest = tmp_path / "acme.backup.db"
        await backup_vault(vault_dir, "acme", dest)
        assert dest.exists()

    async def test_backup_contains_data(self, vault_dir, tmp_path):
        adapter = SqliteVaultAdapter(vault_dir, slug="acme")
        await adapter.create_vault("acme")
        doc_id = await adapter.store_document("contract.pdf")
        await adapter.store_chunk(doc_id, "confidential", unit(384, 0), 0)

        dest = tmp_path / "acme.backup.db"
        await backup_vault(vault_dir, "acme", dest)

        # Verify by reading the backup file directly
        restored = SqliteVaultAdapter(tmp_path, slug="restored")
        import shutil
        shutil.copy(dest, tmp_path / "client_restored.db")
        doc = await restored.get_document(doc_id)
        assert doc["filename"] == "contract.pdf"
        chunks = await restored.search_similar(unit(384, 0), limit=5)
        assert len(chunks) == 1

    async def test_backup_missing_vault_raises(self, vault_dir, tmp_path):
        with pytest.raises(FileNotFoundError):
            await backup_vault(vault_dir, "nope", tmp_path / "x.db")

    async def test_slug_traversal_rejected(self, vault_dir, tmp_path):
        with pytest.raises(ValueError):
            await backup_vault(vault_dir, "../evil", tmp_path / "x.db")


class TestRestore:
    async def test_restore_recreates_vault(self, vault_dir, tmp_path):
        adapter = SqliteVaultAdapter(vault_dir, slug="acme")
        await adapter.create_vault("acme")
        doc_id = await adapter.store_document("contract.pdf")
        dest = tmp_path / "acme.backup.db"
        await backup_vault(vault_dir, "acme", dest)

        # Destroy the live vault, then restore from backup
        adapter.close()
        await adapter.delete_vault("acme")
        await restore_vault(vault_dir, "acme", dest)

        restored = SqliteVaultAdapter(vault_dir, slug="acme")
        doc = await restored.get_document(doc_id)
        assert doc is not None
        assert doc["filename"] == "contract.pdf"

    async def test_restore_missing_backup_raises(self, vault_dir, tmp_path):
        with pytest.raises(FileNotFoundError):
            await restore_vault(vault_dir, "acme", tmp_path / "ghost.db")

    async def test_restore_traversal_rejected(self, vault_dir, tmp_path):
        with pytest.raises(ValueError):
            await restore_vault(vault_dir, "../evil", tmp_path / "x.db")
