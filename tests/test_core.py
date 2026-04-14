import pytest
from app.core.monitor import monitor
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.reranker import get_reranked_scores

# ---------------------------------------------------------
# 1. TOKEN & CHUNKING TESTS
# ---------------------------------------------------------

def test_token_counter_lazy_init():
    """Proves the tiktoken lazy initialization works without crashing."""
    text = "Initiating Sovereign Audit Protocol."
    tokens = monitor.count_tokens(text)
    assert tokens > 0, "Token count should not be zero."
    assert tokens < 20, "Token count is unnaturally high."

def test_markdown_preservation():
    """
    CRITICAL: Proves that our SOTA chunker no longer destroys Markdown Tables.
    This ensures 'Table Mode' (/axm -t) will receive structured data.
    """
    financial_data = "### Q1 Revenue\n| Metric | 2025 | 2026 |\n| Revenue | $1M | $2M |"
    chunks = chunker.split_text(financial_data)
    
    assert len(chunks) > 0, "Chunker failed to output text."
    assert "|" in chunks[0], "FATAL: Chunker destroyed the Markdown table pipes!"
    assert "###" in chunks[0], "FATAL: Chunker destroyed the Markdown headers!"

# ---------------------------------------------------------
# 2. NEURAL INFERENCE TESTS (NVIDIA NIM)
# ---------------------------------------------------------

def test_nemotron_multilingual_embeddings():
    """
    Proves the Nemotron-1B model is online and returning exactly 1024-D vectors.
    Tests a non-English string to verify global compliance.
    """
    french_text = "Le système d'audit souverain est en ligne."
    vector = get_embedding(french_text, input_type="passage")
    
    assert len(vector) == 1024, f"Dimension Mismatch! Expected 1024, got {len(vector)}."
    
    # If this fails, it means the API timed out and our failsafe returned [0.0] * 1024
    assert vector[0] != 0.0, "API TIMEOUT: NVIDIA failed to return a vector. Try again in 60s."

@pytest.mark.asyncio
async def test_nemotron_cloud_reranker():
    """
    Proves the Nemotron-1B Reranker correctly sorts semantic logic.
    """
    query = "What is the liability limitation for the company?"
    
    # We give it 3 documents. Only 1 is correct.
    dummy_documents =[
        "The weather in California is usually sunny.",
        "The company's liability is strictly capped at $1,000,000 USD per incident.",
        "The CEO's name is Tim Cook."
    ]
    
    # Ask the reranker to give us the single best match (top_k=1)
    ranked_results = await get_reranked_scores(query, dummy_documents, top_k=1)
    
    assert len(ranked_results) == 1, "Reranker returned the wrong number of documents."
    
    # If this fails, the API timed out and returned the unsorted original array
    assert "capped at $1,000,000" in ranked_results[0], "API TIMEOUT or Reranker Logic Failure!"
