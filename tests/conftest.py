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
