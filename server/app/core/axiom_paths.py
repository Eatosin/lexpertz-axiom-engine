"""Dynamic path resolution for the SiaS desktop runtime (Phase 0).

All file access in the sidecar resolves against the OS home directory —
never hardcoded developer paths. Windows uses ``%APPDATA%/AxiomEngine``;
macOS/Linux use ``~/.axiom-engine``.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

__all__ = [
    "AXIOM_HOME",
    "VAULTS_DIR",
    "TEMP_DIR",
    "LOGS_DIR",
    "CONFIG_PATH",
    "get_axiom_home",
    "get_vault_dir",
    "get_temp_dir",
    "get_log_dir",
    "get_config_path",
    "ensure_dirs",
]


def _get_axiom_home() -> Path:
    """Resolve the Axiom home directory for the current OS."""
    if sys.platform == "win32":
        appdata = os.environ.get("APPDATA")
        if appdata:
            return Path(appdata) / "AxiomEngine"
        return Path.home() / "AxiomEngine"
    return Path.home() / ".axiom-engine"


AXIOM_HOME = _get_axiom_home()
VAULTS_DIR = AXIOM_HOME / "vaults"
TEMP_DIR = AXIOM_HOME / "temp"
LOGS_DIR = AXIOM_HOME / "logs"
CONFIG_PATH = AXIOM_HOME / "config.json"


def ensure_dirs() -> None:
    """Create the Axiom directory tree on first access."""
    for directory in (AXIOM_HOME, VAULTS_DIR, TEMP_DIR, LOGS_DIR):
        directory.mkdir(parents=True, exist_ok=True)


def get_axiom_home() -> Path:
    """Return the Axiom home directory, creating it if needed."""
    AXIOM_HOME.mkdir(parents=True, exist_ok=True)
    return AXIOM_HOME


def get_vault_dir() -> Path:
    """Return the multi-vault directory, creating it if needed."""
    VAULTS_DIR.mkdir(parents=True, exist_ok=True)
    return VAULTS_DIR


def get_temp_dir() -> Path:
    """Return the ephemeral uploads directory, creating it if needed."""
    TEMP_DIR.mkdir(parents=True, exist_ok=True)
    return TEMP_DIR


def get_log_dir() -> Path:
    """Return the logs directory, creating it if needed."""
    LOGS_DIR.mkdir(parents=True, exist_ok=True)
    return LOGS_DIR


def get_config_path() -> Path:
    """Return the config.json path (does not create the file)."""
    return CONFIG_PATH
