"""SQLite vault backup & restore using the sqlite3 backup API (PRD 1.9).

Uses ``Connection.backup()`` (not raw file copy) so backups are consistent
even under WAL mode. Run before destructive migrations.
"""

from __future__ import annotations

import asyncio
import re
import sqlite3
from pathlib import Path

from app.core.sqlite_adapter import _validate_slug

__all__ = ["backup_vault", "restore_vault"]


def _open(path: Path) -> sqlite3.Connection:
    return sqlite3.connect(str(path))


async def backup_vault(vault_dir: Path, slug: str, dest_path: Path) -> None:
    """Back up ``vaults/client_<slug>.db`` to ``dest_path`` (WAL-consistent).

    Raises ``ValueError`` for an invalid slug, ``FileNotFoundError`` when the
    vault does not exist.
    """
    _validate_slug(slug)
    vault_dir = Path(vault_dir)
    dest_path = Path(dest_path)
    src_path = vault_dir / f"client_{slug}.db"
    if not src_path.exists():
        raise FileNotFoundError(f"vault not found: {src_path}")

    def _copy() -> None:
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        src = _open(src_path)
        try:
            dest = _open(dest_path)
            try:
                src.backup(dest)
            finally:
                dest.close()
        finally:
            src.close()

    await asyncio.to_thread(_copy)


async def restore_vault(vault_dir: Path, slug: str, backup_path: Path) -> None:
    """Restore ``vaults/client_<slug>.db`` from ``backup_path``.

    Overwrites an existing vault file. Raises ``ValueError`` for an invalid
    slug, ``FileNotFoundError`` when the backup does not exist.
    """
    _validate_slug(slug)
    vault_dir = Path(vault_dir)
    backup_path = Path(backup_path)
    if not backup_path.exists():
        raise FileNotFoundError(f"backup not found: {backup_path}")
    dest_path = vault_dir / f"client_{slug}.db"

    def _copy() -> None:
        vault_dir.mkdir(parents=True, exist_ok=True)
        src = _open(backup_path)
        try:
            dest = _open(dest_path)
            try:
                src.backup(dest)
            finally:
                dest.close()
        finally:
            src.close()

    await asyncio.to_thread(_copy)
