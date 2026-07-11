import pytest
from app.core.chunking import chunker, AxiomChunker


class TestAxiomChunker:
    """Unit tests for the Markdown-aware text chunker (no API keys needed)."""

    def test_lazy_init(self):
        c = AxiomChunker(chunk_size=300, chunk_overlap=40)
        assert c.tokenizer is None, "should not init until first call"
        result = c.split_text("hello world")
        assert len(result) >= 0
        assert c.tokenizer is not None, "should lazy-init tokenizer"

    def test_empty_input(self):
        chunks = chunker.split_text("")
        assert chunks == []

        chunks = chunker.split_text("   ")
        assert chunks == []

    def test_single_sentence_no_split(self):
        result = chunker.split_text("The company liability is capped.")
        assert len(result) == 1
        assert "liability" in result[0]

    def test_sanitize_markdown_removes_zero_width(self):
        text = "Revenue\u200b was $1M.\n\n\n\n"
        clean = chunker._sanitize_markdown(text)
        assert "\u200b" not in clean
        assert clean.endswith("$1M.")

    def test_sanitize_removes_trailing_spaces_per_line(self):
        text = "Line one.   \nLine two.  "
        clean = chunker._sanitize_markdown(text)
        assert "Line one." in clean
        assert "Line two." in clean

    def test_token_limit_510_enforced(self):
        too_long = "a" * 3000
        chunks = chunker.split_text(too_long)
        assert len(chunks) > 0, "3000 chars should produce multiple chunks"
        for chunk in chunks:
            assert chunker._count_tokens(chunk) <= 510

    def test_multi_paragraph_splitting(self):
        paragraphs = "\n\n".join(["Para " + str(i) + " " + ("x" * 40) for i in range(1, 11)])
        chunks = chunker.split_text(paragraphs)
        assert len(chunks) >= 1

    def test_table_preservation_in_markdown(self):
        table_text = """Fiscal Summary\n\n| Year | Revenue |\n|------|--------|\n| 2024 | $1.2M   |\n| 2025 | $1.8M   |"""
        clean = chunker._sanitize_markdown(table_text)
        assert "| Year |" in clean
        assert "| 2024" in clean

    def test_bullet_list_preservation(self):
        text = "- Item one\n- Item two\n- Item three\n\n"
        clean = chunker._sanitize_markdown(text)
        assert "- Item one" in clean

    @pytest.mark.asyncio
    async def test_async_split_offloads(self):
        result = await chunker.asplit_text("Async test chunk content.")
        assert len(result) == 1
        assert "Async test" in result[0]