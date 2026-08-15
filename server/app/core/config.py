"""SiaS runtime configuration (Phase 0).

JSON config file at ``<axiom_home>/config.json``. Loaded on boot, persisted
on change. Fields: active vault, embedding mode, theme, and portal settings.
"""

from __future__ import annotations

import json
import threading
from pathlib import Path
from typing import Any, Dict, Optional

from app.core.axiom_paths import get_config_path

DEFAULTS: Dict[str, Any] = {
    "active_vault": None,
    "default_vault": None,
    "embedding_mode": "adaptive",
    "nvidia_api_key": "",
    "theme": "dark",
    "auto_start": True,
    "sidecar_port": 0,
    "log_level": "info",
    "last_vaults": [],
    "portal_url": "https://auth.axiom.ai",
}


class SiaSConfig:
    """Load/persist the JSON runtime config. Thread-safe for sidecar use."""

    def __init__(self, config_path: Optional[Path] = None) -> None:
        self._path = config_path or get_config_path()
        self._lock = threading.Lock()
        self._data: Dict[str, Any] = dict(DEFAULTS)
        self.load()

    # ------------------------------------------------------------------
    # Load / persist
    # ------------------------------------------------------------------

    def load(self) -> None:
        """Load config from disk, merging over defaults. Missing file -> defaults."""
        if not self._path.exists():
            self.persist()
            return
        try:
            with self._path.open("r", encoding="utf-8") as fh:
                loaded = json.load(fh)
            if isinstance(loaded, dict):
                self._data = {**DEFAULTS, **loaded}
        except (json.JSONDecodeError, OSError):
            # Corrupt or unreadable config: fall back to defaults, do not crash.
            self._data = dict(DEFAULTS)

    def persist(self) -> None:
        """Write the config to disk, creating the parent directory."""
        self._path.parent.mkdir(parents=True, exist_ok=True)
        with self._lock:
            with self._path.open("w", encoding="utf-8") as fh:
                json.dump(self._data, fh, indent=2)

    # ------------------------------------------------------------------
    # Accessors / mutation
    # ------------------------------------------------------------------

    def get(self, key: str, default: Any = None) -> Any:
        return self._data.get(key, default)

    def set(self, key: str, value: Any) -> None:
        with self._lock:
            self._data[key] = value
            self.persist()

    def __getitem__(self, key: str) -> Any:
        return self._data[key]

    def __contains__(self, key: str) -> bool:
        return key in self._data

    @property
    def active_vault(self) -> Optional[str]:
        return self._data.get("active_vault")

    @active_vault.setter
    def active_vault(self, slug: str) -> None:
        self.set("active_vault", slug)

    @property
    def embedding_mode(self) -> str:
        return self._data.get("embedding_mode", "adaptive")

    @property
    def theme(self) -> str:
        return self._data.get("theme", "dark")

    def as_dict(self) -> Dict[str, Any]:
        with self._lock:
            return dict(self._data)
