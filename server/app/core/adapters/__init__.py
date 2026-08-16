"""Vault adapter factory — selects the VaultPort implementation.

``SiaSConfig.vault_type`` picks the backend:
- ``sqlite`` (default) — per-client SQLite files with vec0 vector search
- ``supabase`` — legacy cloud backend, kept for the migration window
  (decision D4 in ``docs/DECISIONS/2026-08-16-sqlite-multi-vault.md``)
"""

from __future__ import annotations

from typing import Optional

from app.core.axiom_paths import get_vault_dir
from app.core.config import SiaSConfig
from app.core.ports import VaultPort
from app.core.sqlite_adapter import SqliteVaultAdapter

from .supabase_adapter import SupabaseVaultAdapter

__all__ = ["get_vault", "SupabaseVaultAdapter", "SqliteVaultAdapter"]


def get_vault(config: Optional[SiaSConfig] = None) -> VaultPort:
    """Return the VaultPort implementation selected by ``SiaSConfig``.

    Raises ``ValueError`` for an unknown ``vault_type`` — fail fast, never
    silently fall back to a different backend.
    """
    cfg = config or SiaSConfig()
    vault_type = cfg.get("vault_type", "sqlite")
    if vault_type == "sqlite":
        slug = cfg.get("active_vault") or "default"
        return SqliteVaultAdapter(get_vault_dir(), slug=slug)
    if vault_type == "supabase":
        return SupabaseVaultAdapter()
    raise ValueError(f"unknown vault_type: {vault_type!r}")
