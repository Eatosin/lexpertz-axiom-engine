import os
from typing import List, Tuple, Any, Optional
from sentence_transformers import CrossEncoder # type: ignore

class AxiomReranker:
    """
    SOTA Enterprise Reranker.
    Uses BGE-Reranker-v2-m3 (Cross-Encoder) via SentenceTransformers.
    Fixed: 'cache_dir' parameter update for v3.x compatibility.
    """
    _instance: Optional['AxiomReranker'] = None
    _model: Any = None
    _model_id = "BAAI/bge-reranker-v2-m3"

    def __new__(cls) -> 'AxiomReranker':
        if cls._instance is None:
            cls._instance = super(AxiomReranker, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self) -> None:
        try:
            print(f"AXIOM-CORE: Materializing Reranker on CPU...")
            # Cache to /tmp for Hugging Face writable permissions
            cache = "/tmp/axiom_models"
            os.makedirs(cache, exist_ok=True)
            
            self._model = CrossEncoder(
                self._model_id,
                cache_dir=cache, # <--- FIXED: Was 'cache_folder'
                device="cpu",
                max_length=512
            )
            print("AXIOM-CORE: Reranker Online.")
        except Exception as e:
            print(f"⚠️ Reranker init failed: {e}")
            self._model = None

    def rerank(self, query: str, documents: List[str], top_k: int = 5) -> List[str]:
        """
        The Auditor Node calls this. 
        It ranks documents by true semantic relevance to the query.
        """
        if not documents:
            return []
            
        if self._model is None:
            # Fail-safe: return original top-k if model failed to load
            print("⚠️ RERANKER OFFLINE: Falling back to raw retrieval.")
            return documents[:top_k]
            
        try:
            # 1. Format pairs: [[query, doc1], [query, doc2]...]
            pairs = [[query, doc] for doc in documents]
            
            # 2. Predict Scores using the internal model instance
            # We use .predict() which is the correct method for CrossEncoder
            scores = self._model.predict(pairs, batch_size=16)
            
            # 3. Zip, Sort, and Extract
            combined: List[Tuple[str, float]] = []
            for doc, score in zip(documents, scores):
                combined.append((doc, float(score)))

            # Sort descending: highest score first
            ranked_tuples = sorted(combined, key=lambda x: x[1], reverse=True)
            
            # Debug: Log the top score to monitor retrieval health
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
