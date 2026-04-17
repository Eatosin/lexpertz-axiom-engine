import pytest
from app.core.monitor import monitor
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.reranker import get_reranked_scores


# ---------------------------------------------------------
# 1. TOKEN & CHUNKING TESTS – FULL PATH COVERAGE
# ---------------------------------------------------------

def test_token_counter_lazy_init():
    """Verifies tiktoken lazy initialization and basic token counting (core dependency)."""
    text = "Initiating Sovereign Audit Protocol."
    tokens = monitor.count_tokens(text)
    assert tokens > 0, "Token count should never be zero."
    assert tokens < 20, "Token count is unnaturally high for short text."


@pytest.mark.parametrize(
    "test_case, text, expected_min_tokens, description",
    [
        ("normal_text", "Initiating Sovereign Audit Protocol.", 4, "Basic English text"),
        ("empty_string", "", 0, "Empty input must not crash"),
        ("long_text", "x" * 5000, 1000, "Very long input (stress test)"),
        ("non_ascii", "Le système d'audit souverain est en ligne. 审计协议已启动。", 15, "Multilingual / non-ASCII safety"),
    ],
    ids=["normal", "empty", "long", "multilingual"]
)
def test_token_counter_all_paths(test_case, text, expected_min_tokens, description):
    """
    Protects against token-counter regressions that could break context guards,
    pricing calculations, or rate-limit enforcement in production.
    """
    tokens = monitor.count_tokens(text)
    assert tokens >= expected_min_tokens if expected_min_tokens > 0 else True, f"Failed on {description}"


@pytest.mark.parametrize(
    "test_case, financial_data, critical_pattern",
    [
        ("simple_table", "### Q1 Revenue\n| Metric | 2025 | 2026 |\n| Revenue | $1M | $2M |", "|"),
        ("complex_table", "| Header1 | Header2 |\n|---------|---------|\n| Data1   | Data2   |", "|"),
        ("headers_and_table", "# Section\n## Sub\n| Col1 | Col2 |\n|------|------|", "###"),
        ("mixed_markdown", "**Bold** and *italic* with table:\n| A | B |", "**"),
    ],
    ids=["simple_table", "complex_table", "headers_and_table", "mixed_markdown"]
)
def test_markdown_preservation_all_paths(test_case, financial_data, critical_pattern):
    """
    CRITICAL: Ensures the SOTA chunker never destroys Markdown tables or structural syntax.
    This directly protects '/axm -t' Table Mode and any financial/reporting use cases.
    """
    chunks = chunker.split_text(financial_data)

    assert len(chunks) > 0, f"Chunker returned no chunks for {test_case}"
    assert critical_pattern in "".join(chunks), f"FATAL: Chunker destroyed critical Markdown syntax ({critical_pattern}) in {test_case}"


# ---------------------------------------------------------
# 2. NEURAL INFERENCE TESTS (NVIDIA NIM) – FULL PATH COVERAGE
# ---------------------------------------------------------

@pytest.mark.parametrize(
    "test_case, input_text, expected_dim, description",
    [
        ("english", "What is the company's liability limit?", 1024, "Standard English passage"),
        ("multilingual", "Le système d'audit souverain est en ligne. 审计协议已启动。", 1024, "Non-English safety"),
        ("edge_empty", "", 1024, "Empty string fallback"),
    ],
    ids=["english", "multilingual", "empty"]
)
def test_nemotron_multilingual_embeddings_all_paths(test_case, input_text, expected_dim, description):
    """
    Verifies Nemotron-1B embeddings return correct 1024-D vectors and gracefully handle edge cases.
    Detects API timeout / fallback to zero-vector (critical for RAG resilience).
    """
    vector = get_embedding(input_text, input_type="passage")

    assert len(vector) == expected_dim, f"Dimension mismatch in {description} (got {len(vector)})"
    # Explicit fallback detection
    if input_text.strip() == "":
        assert all(x == 0.0 for x in vector), "Empty input should return zero-vector fallback"
    else:
        assert vector[0] != 0.0, f"API TIMEOUT or fallback triggered for {description}"


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "test_case, query, documents, top_k, expected_in_top_result, should_be_sorted",
    [
        # Happy path
        ("happy_path", "What is the liability limitation?", [
            "The weather in California is usually sunny.",
            "The company's liability is strictly capped at $1,000,000 USD per incident.",
            "The CEO's name is Tim Cook."
        ], 1, "$1,000,000", True),
        # All irrelevant documents
        ("all_irrelevant", "What is the weather like?", [
            "The company's liability is strictly capped at $1,000,000 USD.",
            "Financial report 2025",
            "CEO signature required"
        ], 1, "", False),  # should still return something, but not "relevant"
        # Empty documents list
        ("empty_docs", "Any query", [], 1, "", False),
    ],
    ids=["happy_path", "all_irrelevant", "empty_docs"]
)
async def test_nemotron_cloud_reranker_all_paths(test_case, query, documents, top_k, expected_in_top_result, should_be_sorted):
    """
    Validates NeMo Retriever Reranker (nvidia/llama-nemotron-rerank-1b-v2) across all critical paths.
    Ensures correct top-k ordering and detects API fallback (returns unsorted original list).
    """
    ranked_results = await get_reranked_scores(query, documents, top_k=top_k)

    assert len(ranked_results) == min(top_k, len(documents)) or len(ranked_results) == len(documents), \
        f"Reranker returned wrong number of documents in {test_case}"

    if expected_in_top_result:
        assert expected_in_top_result in ranked_results[0], f"Top result did not contain expected content in {test_case}"

    # Fallback detection: if reranker is broken, it returns original unsorted order
    if should_be_sorted and len(documents) > 1:
        assert "capped at $1,000,000" in ranked_results[0], \
            f"API TIMEOUT or Reranker Logic Failure in {test_case} (fallback to original order)"
