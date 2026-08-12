import os
import sys
import warnings
from pathlib import Path
from dotenv import load_dotenv

# =============================================================================
# AXIOM-CORE TEST ENVIRONMENT BOOTSTRAP
# Enterprise-grade setup that runs BEFORE pytest collects any tests.
# Guarantees consistent environment for ALL test files.
# =============================================================================

def _load_test_environment() -> None:
    """Load .env and validate critical variables for the entire test suite."""
    
    # 1. Resolve .env path (works from anywhere: Colab, CI, Docker, local)
    project_root = Path(__file__).resolve().parent.parent
    env_path = project_root / ".env"
    
    if env_path.exists():
        load_dotenv(env_path, override=True)
        print(f"\n[Axiom Test Setup] ✅ Neural Environment Loaded from {env_path}")
    else:
        warnings.warn(
            f"\n⚠️  .env file not found at {env_path}\n"
            "   Tests will run with fallback/mock values where possible.\n"
            "   Some NVIDIA NIM / Groq tests may be skipped.",
            UserWarning,
            stacklevel=2
        )

    # 2. Critical environment variable validation (fail fast with clear message)
    required_vars = {
        "NVIDIA_API_KEY": "NVIDIA NIM endpoints (reranker, embeddings, LLMs)",
        "GROQ_API_KEY": "Groq fallback models (Llama-3.3-70B, etc.)",
    }
    
    missing = []
    for var, purpose in required_vars.items():
        if not os.getenv(var):
            missing.append(f"   • {var} → {purpose}")
    
    if missing:
        warnings.warn(
            "\n⚠️  MISSING CRITICAL ENVIRONMENT VARIABLES:\n"
            + "\n".join(missing)
            + "\n   Some integration tests will be automatically skipped.\n"
            + "   Create a .env file in the project root or set these in CI.",
            UserWarning,
            stacklevel=2
        )

    # 3. Path resolution – add server/ to Python path safely
    server_path = project_root / "server"
    if server_path.exists() and str(server_path) not in sys.path:
        sys.path.insert(0, str(server_path))
        # Optional: also add the root so relative imports work cleanly
        if str(project_root) not in sys.path:
            sys.path.insert(0, str(project_root))

    print(f"[Axiom Test Setup] PATH RESOLVED → Server root added at {server_path}")


# =============================================================================
# RUN THE BOOTSTRAP (executes automatically when this file is imported)
# =============================================================================
if __name__ == "__main__" or "pytest" in sys.modules:
    _load_test_environment()

# =============================================================================
# SHARED FIXTURES — Singleton mocking + test utilities
# =============================================================================
import pytest
from unittest.mock import patch, MagicMock, AsyncMock
from typing import Dict, Any


def pytest_collection_modifyitems(config, items):
    """Auto-skip tests gated by missing API keys.

    The ``requires_nvidia`` and ``requires_groq`` markers in pyproject.toml
    are documentation only by default. This hook turns them into actual
    skips when the relevant API key is not provisioned in the environment
    (CI, CodeSpaces, local without a .env).
    """
    has_nvidia = bool(os.getenv("NVIDIA_API_KEY"))
    has_groq = bool(os.getenv("GROQ_API_KEY"))
    skip_markers = []
    if not has_nvidia:
        skip_markers.append(pytest.mark.skip(reason="NVIDIA_API_KEY not set"))
    if not has_groq:
        skip_markers.append(pytest.mark.skip(reason="GROQ_API_KEY not set"))

    for item in items:
        markers = {m.name for m in item.iter_markers()}
        if "requires_nvidia" in markers and not has_nvidia:
            item.add_marker(pytest.mark.skip(reason="NVIDIA_API_KEY not set"))
        if "requires_groq" in markers and not has_groq:
            item.add_marker(pytest.mark.skip(reason="GROQ_API_KEY not set"))


@pytest.fixture(autouse=True)
def mock_db_singleton():
    """Mock Database singleton so no Supabase connection is attempted."""
    with patch('app.core.database.Database._init_client', return_value=None), \
         patch('app.core.database.Database.client', None), \
         patch('app.core.database.db', None):
        yield

@pytest.fixture(autouse=True)
def mock_embedding_singleton():
    """Mock EmbeddingAdapter singleton to avoid NVIDIA API calls."""
    with patch('app.core.embeddings._engine._client', None), \
         patch('app.core.embeddings.get_embedding', return_value=[0.0] * 1024):
        yield

@pytest.fixture(autouse=True)
def mock_reranker_singleton():
    """Mock Reranker singleton to avoid NVIDIA NIM calls."""
    from app.core.reranker import AxiomReranker
    orig = AxiomReranker._client
    AxiomReranker._client = None
    yield
    AxiomReranker._client = orig

@pytest.fixture(autouse=True)
def mock_content_monitor():
    """Mock ContextMonitor to avoid tokenizer initialization overhead."""
    import app.core.monitor
    orig = app.core.monitor.monitor.encoder
    mock_encoder = MagicMock()

    # Return approximately the right number of tokens
    # (rough heuristic: ~1 token per 4 chars for English text).
    def _fake_encode(text):
        if not text:
            return []
        length = max(1, len(text) // 4)
        return [1] * length

    mock_encoder.encode.side_effect = _fake_encode
    app.core.monitor.monitor.encoder = mock_encoder
    yield
    app.core.monitor.monitor.encoder = orig

@pytest.fixture
def agent_state_factory():
    """Factory fixture for creating clean AgentState dicts."""
    def _make_state(overrides: Dict[str, Any] = None) -> Dict[str, Any]:
        base: Dict[str, Any] = {
            "question": "Test question",
            "user_id": "test-user",
            "filenames": ["test.pdf"],
            "history": [],
            "command": None,
            "comparison_map": {},
            "documents": ["Test passage content."],
            "generation": "",
            "hallucination_score": 0.0,
            "metrics": {},
            "status": "thinking",
            "retry_count": 0,
            "active_node": None,
        }
        if overrides:
            base.update(overrides)
        return base
    return _make_state

@pytest.fixture
def mock_llm_response():
    """Mock LLM chat model that returns a canned response."""
    def _make_mock(content="Mocked LLM response"):
        mock = MagicMock()
        mock.content = content
        mock_chain = AsyncMock()
        mock_chain.ainvoke.return_value = mock
        return mock_chain
    return _make_mock

@pytest.fixture
def mock_structured_output():
    """Mock structured output chain for Editor/Prosecutor node tests."""
    def _make_mock(obj):
        mock = AsyncMock()
        mock.ainvoke.return_value = obj
        return mock
    return _make_mock
