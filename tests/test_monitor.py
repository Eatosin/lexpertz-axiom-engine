import pytest
from unittest.mock import patch, MagicMock
from app.core.monitor import ContextMonitor, monitor


class TestContextMonitor:
    """Unit tests for context guard / token sentry."""

    def test_empty_input(self):
        result = monitor.guard_context([])
        assert result == ""

    def test_small_context_no_truncation(self):
        chunks = ["Short chunk 1", "Short chunk 2"]
        result = monitor.guard_context(chunks)
        assert "Short chunk 1" in result
        assert "Short chunk 2" in result

    def test_limit_enforcement_100k(self):
        long_text = "z" * 300
        chunks = [long_text] * 1000
        result = monitor.guard_context(chunks)
        assert len(result) < len("\n\n".join(chunks))

    def test_token_count_zero_for_empty(self):
        assert monitor.count_tokens("") == 0