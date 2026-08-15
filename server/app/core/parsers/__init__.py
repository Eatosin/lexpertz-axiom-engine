"""Parser registry — dispatch files to format-specific parsers (Phase 6).

``PARSERS`` maps lowercase extensions to parser functions; each returns a
Markdown string. Registry is the single seam the ingest pipeline uses.
"""

from __future__ import annotations

from pathlib import Path

from app.core.parsers.pdf_parser import pdf_to_markdown

PARSERS = {
    ".pdf": pdf_to_markdown,
    ".xlsx": None,  # wired in Phase 6.1 (openpyxl)
    ".csv": None,  # wired in Phase 6.2 (pandas)
}


def dispatch_parser(file_path: str) -> str:
    """Parse ``file_path`` into Markdown by extension.

    Raises ``ValueError`` for unregistered extensions and
    ``FileNotFoundError`` when the file does not exist.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File not found: {file_path}")

    parser = PARSERS.get(path.suffix.lower())
    if parser is None:
        raise ValueError(f"No parser registered for extension: {path.suffix}")

    return parser(str(path))


__all__ = ["PARSERS", "dispatch_parser"]
