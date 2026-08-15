"""Tests for dynamic axiom home path resolution (Phase 0)."""

import os
import sys
from pathlib import Path
from unittest.mock import patch

import pytest


@pytest.fixture
def isolated_axiom_home(tmp_path, monkeypatch):
    """Point AXIOM_HOME at a temp dir so tests never touch the real one."""
    import app.core.axiom_paths as ap

    monkeypatch.setattr(ap, "AXIOM_HOME", tmp_path)
    monkeypatch.setattr(ap, "VAULTS_DIR", tmp_path / "vaults")
    monkeypatch.setattr(ap, "TEMP_DIR", tmp_path / "temp")
    monkeypatch.setattr(ap, "LOGS_DIR", tmp_path / "logs")
    monkeypatch.setattr(ap, "CONFIG_PATH", tmp_path / "config.json")
    return ap


class TestGetAxiomHome:
    def test_windows_uses_appdata(self, monkeypatch):
        import app.core.axiom_paths as ap

        monkeypatch.setattr(sys, "platform", "win32")
        monkeypatch.setattr(os, "environ", {"APPDATA": r"C:\Users\Test\AppData\Roaming"}, raising=False)
        assert ap._get_axiom_home() == Path(r"C:\Users\Test\AppData\Roaming") / "AxiomEngine"

    def test_windows_falls_back_when_appdata_missing(self, monkeypatch):
        import app.core.axiom_paths as ap

        monkeypatch.setattr(sys, "platform", "win32")
        env = {k: v for k, v in os.environ.items() if k != "APPDATA"}
        monkeypatch.setattr(os, "environ", env, raising=False)
        assert ap._get_axiom_home() == Path.home() / "AxiomEngine"

    def test_non_windows_uses_home(self, monkeypatch):
        import app.core.axiom_paths as ap

        monkeypatch.setattr(sys, "platform", "linux")
        assert ap._get_axiom_home() == Path.home() / ".axiom-engine"


class TestDirs:
    def test_ensure_dirs_creates_all(self, isolated_axiom_home):
        ap = isolated_axiom_home
        ap.ensure_dirs()
        assert ap.VAULTS_DIR.is_dir()
        assert ap.TEMP_DIR.is_dir()
        assert ap.LOGS_DIR.is_dir()

    def test_get_vault_dir_creates_on_access(self, isolated_axiom_home):
        ap = isolated_axiom_home
        vault_dir = ap.get_vault_dir()
        assert vault_dir.is_dir()
        assert vault_dir.name == "vaults"

    def test_get_temp_dir_creates_on_access(self, isolated_axiom_home):
        ap = isolated_axiom_home
        temp_dir = ap.get_temp_dir()
        assert temp_dir.is_dir()
        assert temp_dir.name == "temp"

    def test_get_log_dir_creates_on_access(self, isolated_axiom_home):
        ap = isolated_axiom_home
        log_dir = ap.get_log_dir()
        assert log_dir.is_dir()
        assert log_dir.name == "logs"

    def test_get_config_path_within_home(self, isolated_axiom_home):
        ap = isolated_axiom_home
        assert ap.get_config_path() == ap.CONFIG_PATH
