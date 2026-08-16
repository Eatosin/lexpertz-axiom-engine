"""Tests for SiaSConfig runtime configuration (Phase 0 + BYOK fields)."""

import json

import pytest

from app.core.config import SiaSConfig


@pytest.fixture
def config(tmp_path):
    return SiaSConfig(config_path=tmp_path / "config.json")


class TestDefaults:
    def test_byok_provider_defaults_local_first(self, config):
        assert config.get("provider") == "ollama"

    def test_ollama_url_default(self, config):
        assert config.get("ollama_url") == "http://localhost:11434"

    def test_nvidia_key_empty_by_default(self, config):
        assert config.get("nvidia_api_key") == ""

    def test_embedding_mode_default_adaptive(self, config):
        assert config.embedding_mode == "adaptive"


class TestPersistence:
    def test_provider_round_trip(self, config, tmp_path):
        config.set("provider", "deepseek")
        loaded = SiaSConfig(config_path=tmp_path / "config.json")
        assert loaded.get("provider") == "deepseek"

    def test_ollama_url_round_trip(self, config, tmp_path):
        config.set("ollama_url", "http://127.0.0.1:11434")
        loaded = SiaSConfig(config_path=tmp_path / "config.json")
        assert loaded.get("ollama_url") == "http://127.0.0.1:11434"

    def test_nvidia_key_round_trip(self, config, tmp_path):
        config.set("nvidia_api_key", "nvapi-test-key")
        loaded = SiaSConfig(config_path=tmp_path / "config.json")
        assert loaded.get("nvidia_api_key") == "nvapi-test-key"


class TestLegacyMerge:
    def test_missing_byok_fields_fill_from_defaults(self, tmp_path):
        path = tmp_path / "config.json"
        path.write_text(json.dumps({"active_vault": "client_acme"}), encoding="utf-8")
        config = SiaSConfig(config_path=path)
        assert config.active_vault == "client_acme"
        assert config.get("provider") == "ollama"
        assert config.get("ollama_url") == "http://localhost:11434"

    def test_provider_property_accessor(self, config):
        config.set("provider", "openai")
        assert config.get("provider") == "openai"
