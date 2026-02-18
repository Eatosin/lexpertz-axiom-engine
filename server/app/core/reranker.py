import os
from typing import List, Dict, Any, cast, Tuple
from sentence_transformers import CrossEncoder # type: ignore

class AxiomReranker:
    """
    SOTA Enterprise Reranker.
    Uses BGE-Reranker-v2-m3 (Cross-Encoder) via SentenceTransformers.
    """
    _instance: Any = None
    _model_id = "BAAI/bge-reranker-v2-m3"

    def __new__(cls):
        if cls._instance is None:
            try:
                print(f"AXIOM-CORE: Materializing Reranker on CPU...")
                # Cache to /tmp for Hugging Face writable permission
                cache = "/tmp/axiom_models"
                os.makedirs(cache, exist_ok=True)
                
                cls._instance = CrossEncoder(
                    cls._model_id,
                    cache_folder=cache,
                    device="cpu",
                    max_length=512
                )
            except Exception as e:
                print(f"⚠️ Reranker init failed: {e}")
        return cls._instance

    def rerank(self, query: str, documents: List[str], top_k: int = 5) -> List[str]:
        if not documents or self._instance is None:
            # Fail safe: return original docs if reranker is dead
            return documents[:top_k] if documents else []
            
        try:
            # 1. Format pairs: [[query, doc1], [query, doc2]...]
            pairs = [[query, doc] for doc in documents]
            
            # 2. Predict Scores (Vectorized)
            scores = self._instance.predict(pairs, batch_size=16)
            
            # 3. Zip, Sort, and Extract
            combined: List[Tuple[str, float]] = []
            for doc, score in zip(documents, scores):
                combined.append((doc, float(score)))

            # Sort descending by score
            ranked_tuples = sorted(combined, key=lambda x: x[1], reverse=True)
            
            # Return just the text
            return [t[0] for t in ranked_tuples[:top_k]]

        except Exception as e:
            print(f"❌ RERANK ERROR: {e}")
            return documents[:top_k]

reranker = AxiomReranker()
