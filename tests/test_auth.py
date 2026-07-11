import pytest
from unittest.mock import patch, AsyncMock, MagicMock
import asyncio
import hashlib
import os
from datetime import datetime
from app.core.auth import get_current_user, ClerkKeyManager, key_manager
from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials


class TestClerkKeyManager:
    """Unit tests for Clerk JWKS cache manager."""

    def test_singleton(self):
        m1 = ClerkKeyManager()
        m2 = ClerkKeyManager()
        assert m1 is m2

    def test_get_jwks_empty_when_no_url(self, monkeypatch):
        monkeypatch.delenv("CLERK_JWKS_URL", raising=False)
        km = ClerkKeyManager()
        km._jwks = None
        result = km.get_jwks()
        assert result == {}

    @patch('app.core.auth.requests.get')
    def test_get_jwks_success(self, mock_get):
        mock_response = MagicMock()
        mock_response.json.return_value = {"keys": [{"kid": "test-kid"}]}
        mock_response.raise_for_status.return_value = None
        mock_get.return_value = mock_response

        monkeypatch_ctx = pytest.MonkeyPatch.context()
        with monkeypatch_ctx as mp:
            mp.setenv("CLERK_JWKS_URL", "https://example.com/.well-known/jwks.json")
            km = ClerkKeyManager()
            km._jwks = None
            result = km.get_jwks()
            assert result["keys"][0]["kid"] == "test-kid"

    def test_force_refresh(self, monkeypatch):
        monkeypatch.setenv("CLERK_JWKS_URL", "https://example.com/.well-known/jwks.json")
        km = ClerkKeyManager()
        km._jwks = {"keys": [{"kid": "old"}]}

        with patch('app.core.auth.requests.get') as mock_get:
            mock_response = MagicMock()
            mock_response.json.return_value = {"keys": [{"kid": "new"}]}
            mock_response.raise_for_status.return_value = None
            mock_get.return_value = mock_response
            result = km.get_jwks(force_refresh=True)
            assert result["keys"][0]["kid"] == "new"


class TestGetCurrentUserAxiomKey:
    """Unit tests for API key authentication path."""

    @pytest.mark.asyncio
    async def test_axiom_key_missing_db(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_URL", "")
        monkeypatch.setenv("SUPABASE_SERVICE_KEY", "")

        creds = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="axm_live_testabcdef1234567890"
        )
        with patch("app.core.auth.db", None):
            with pytest.raises(HTTPException) as exc:
                await get_current_user(auth=creds)
            assert exc.value.status_code == 503
            assert "Auth Database Offline" in exc.value.detail

    @pytest.mark.asyncio
    async def test_axiom_key_invalid(self, monkeypatch):
        monkeypatch.setenv("SUPABASE_URL", "https://test.supabase.co")
        monkeypatch.setenv("SUPABASE_SERVICE_KEY", "test-key")

        fake_db = MagicMock()
        fake_db.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []

        creds = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="axm_live_testabcdef1234567890"
        )
        with patch("app.core.auth.db", fake_db):
            with pytest.raises(HTTPException) as exc:
                await get_current_user(auth=creds)
            assert exc.value.status_code == 401

    @pytest.mark.asyncio
    async def test_non_axiom_token_no_jwks_dev_mode(self, monkeypatch):
        monkeypatch.setenv("ENV", "development")
        monkeypatch.delenv("CLERK_JWKS_URL", raising=False)

        creds = HTTPAuthorizationCredentials(
            scheme="Bearer",
            credentials="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImlhdCI6MTUxNjIzOTAyMn0.fake"
        )
        with patch('app.core.auth.key_manager._jwks', None), \
             patch('app.core.auth.key_manager.get_jwks', return_value={}):
            result = await get_current_user(auth=creds)
            assert result == "user_123"