"""Tests for the vault adapter factory (Phase 1a)."""

import pytest

from app.core.adapters import get_vault
from app.core.adapters.supabase_adapter import SupabaseVaultAdapter
from app.core.config import SiaSConfig
from app.core.sqlite_adapter import SqliteVaultAdapter


@pytest.fixture
def isolated_vault_dir(tmp_path, monkeypatch):
    import app.core.axiom_paths as ap

    monkeypatch.setattr(ap, "VAULTS_DIR", tmp_path / "vaults")
    monkeypatch.setattr(ap, "get_vault_dir", lambda: ap.VAULTS_DIR)
    return ap.VAULTS_DIR


class TestVaultTypeDefault:
    def test_defaults_to_sqlite(self, tmp_path):
        config = SiaSConfig(config_path=tmp_path / "config.json")
        assert config.get("vault_type") == "sqlite"


class TestGetVault:
    def test_sqlite_type_returns_sqlite_adapter(self, isolated_vault_dir, tmp_path):
        config = SiaSConfig(config_path=tmp_path / "config.json")
        config.set("vault_type", "sqlite")
        vault = get_vault(config)
        assert isinstance(vault, SqliteVaultAdapter)

    def test_sqlite_adapter_uses_active_vault_slug(self, isolated_vault_dir, tmp_path):
        config = SiaSConfig(config_path=tmp_path / "config.json")
        config.set("vault_type", "sqlite")
        config.set("active_vault", "client_acme")
        vault = get_vault(config)
        assert vault._slug == "client_acme"

    def test_supabase_type_returns_supabase_adapter(self, tmp_path):
        config = SiaSConfig(config_path=tmp_path / "config.json")
        config.set("vault_type", "supabase")
        vault = get_vault(config)
        assert isinstance(vault, SupabaseVaultAdapter)

    def test_unknown_type_raises(self, tmp_path):
        config = SiaSConfig(config_path=tmp_path / "config.json")
        config.set("vault_type", "oracle")
        with pytest.raises(ValueError):
            get_vault(config)

    def test_default_config_returns_sqlite(self, isolated_vault_dir, tmp_path):
        config = SiaSConfig(config_path=tmp_path / "config.json")
        vault = get_vault(config)
        assert isinstance(vault, SqliteVaultAdapter)
