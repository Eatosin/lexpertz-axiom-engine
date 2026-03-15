import os
from typing import List, Tuple, Any, Optional
from sentence_transformers import CrossEncoder # type: ignore

class AxiomReranker:
    """
    SOTA Enterprise Reranker.
    Uses BGE-Reranker-v2-m3 (Cross-Encoder) via SentenceTransformers.
    V3.1 SOTA: Lazy-Initialization to prevent Uvicorn boot hangs.
    """
    _instance: Optional['AxiomReranker'] = None
    _model: Any = None
    _model_id = "BAAI/bge-reranker-v2-m3"

    def __new__(cls) -> 'AxiomReranker':
        if cls._instance is None:
            cls._instance = super(AxiomReranker, cls).__new__(cls)
            # FIX: Removed _initialize_model() to prevent cold-boot hangs
        return cls._instance

    def _lazy_init(self) -> None:
        """Loads the model ONLY when an audit actually requests it."""
        if self._model is not None:
            return

        # NEW: Emergency Kill Switch for constrained hardware (like the i3 laptop)
        if os.getenv("RERANKER_ENABLED", "true").lower() == "false":
            print("AXIOM-CORE: Reranker disabled by ENV. Falling back to raw retrieval.")
            self._model = "DISABLED"
            return

        try:
            print(f"AXIOM-CORE: Materializing Reranker on CPU...")
            # Cache to /tmp for Hugging Face writable permissions
            cache = "/tmp/axiom_models"
            os.makedirs(cache, exist_ok=True)
            
            self._model = CrossEncoder(
                self._model_id,
                cache_dir=cache, 
                device="cpu",
                max_length=512
            )
            print("AXIOM-CORE: Reranker Online.")
        except Exception as e:
            print(f"⚠️ Reranker init failed: {e}")
            self._model = "FAILED"

    def rerank(self, query: str, documents: List[str], top_k: int = 5) -> List[str]:
        """
        The Auditor Node calls this. 
        It ranks documents by true semantic relevance to the query.
        """
        # 1. Trigger the lazy load sequence
        self._lazy_init()

        if not documents:
            return[]
            
        # 2. Fail-safe: return original top-k if model failed to load or is disabled
        if self._model is None or self._model == "FAILED" or self._model == "DISABLED":
            print("⚠️ RERANKER OFFLINE: Falling back to raw retrieval.")
            return documents[:top_k]
            
        try:
            # 3. Format pairs: [[query, doc1],[query, doc2]...]
            pairs = [[query, doc] for doc in documents]
            
            # 4. Predict Scores using the internal model instance
            # We use .predict() which is the correct method for CrossEncoder
            scores = self._model.predict(pairs, batch_size=16)
            
            # 5. Zip, Sort, and Extract
            combined: List[Tuple[str, float]] =[]
            for doc, score in zip(documents, scores):
                combined.append((doc, float(score)))

            # Sort descending: highest score first
            ranked_tuples = sorted(combined, key=lambda x: x[1], reverse=True)
            
            # RESTORED: Log the top score to monitor retrieval health
            if ranked_tuples:
                print(f"DEBUG: Top Rerank Score: {ranked_tuples[0][1]:.4f}")
            
            return [t[0] for t in ranked_tuples[:top_k]]

        except Exception as e:
            print(f"❌ RERANK EXECUTION ERROR: {e}")
            return documents[:top_k]

# Global Accessor
_reranker_instance = AxiomReranker()

def get_reranked_scores(query: str, documents: List[str], top_k: int = 5) -> List[str]:
    """Universal interface for the Librarian Node."""
    return _reranker_instance.rerank(query, documents, top_k=top_k)
