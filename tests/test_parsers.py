"""Tests for the parser registry and MarkItDown-backed PDF parser (Phase 6.0)."""

from pathlib import Path

import pytest

from app.core.parsers import dispatch_parser, pdf_to_markdown

FIXTURES = Path(__file__).resolve().parent / "fixtures"


class TestPdfParser:
    def test_returns_markdown_with_table_rows(self):
        md = pdf_to_markdown(FIXTURES / "sample_audit.pdf")
        assert "|" in md
        assert "Revenue" in md
        assert "Net Income" in md

    def test_detects_headings_from_structure(self):
        md = pdf_to_markdown(FIXTURES / "sample_audit.pdf")
        assert "Sample Audit Report" in md
        assert "Financial Summary" in md

    def test_preserves_prose_content(self):
        md = pdf_to_markdown(FIXTURES / "sample_audit.pdf")
        assert "liability is strictly capped" in md


class TestDispatchParser:
    def test_dispatches_pdf(self):
        md = dispatch_parser(str(FIXTURES / "sample_audit.pdf"))
        assert isinstance(md, str)
        assert len(md) > 0

    def test_unknown_extension_raises(self, tmp_path):
        unknown = tmp_path / "file.xyz"
        unknown.write_text("nope")
        with pytest.raises(ValueError, match="No parser registered"):
            dispatch_parser(str(unknown))

    def test_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            dispatch_parser(str(FIXTURES / "does_not_exist.pdf"))

    def test_registry_mapping(self):
        from app.core.parsers import PARSERS

        assert ".pdf" in PARSERS
        assert ".xlsx" in PARSERS
        assert ".csv" in PARSERS
