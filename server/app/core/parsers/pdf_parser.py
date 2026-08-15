"""PDF → Markdown parser backed by Microsoft MarkItDown (MIT, Phase 6.0).

MarkItDown uses pdfminer.six + pdfplumber under the hood (both MIT) and
handles heading detection + table extraction to Markdown. Fully local —
no model weights, no network, no cloud.
"""

from __future__ import annotations

from markitdown import MarkItDown

_converter: MarkItDown | None = None


def _get_converter() -> MarkItDown:
    """Lazily build the converter (module-level singleton)."""
    global _converter
    if _converter is None:
        # Plugins disabled: no LLM/OCR image captioning, pure local parsing.
        _converter = MarkItDown(enable_plugins=False)
    return _converter


def pdf_to_markdown(file_path: str) -> str:
    """Convert a PDF file to Markdown, preserving headings and tables.

    Raises ``FileNotFoundError`` for a missing file.
    """
    converter = _get_converter()
    result = converter.convert(file_path)
    return result.text_content


__all__ = ["pdf_to_markdown"]
