import os
from typing import List, Dict, Any, cast, Tuple
from sentence_transformers import CrossEncoder # type: ignore

class AxiomReranker:
    """
    SOTA Enterprise Reranker.
    Uses Tuple-based sorting to satisfy strict MyPy 2026 type requirements.
    """
    _instance: Any = None
    _model_id = "BAAI/bge-reranker-v2-m3"

    def __new__(cls):
        if cls._instance is None:
            try:
                print(f"AXIOM-CORE: Materializing Reranker on CPU...")
                cls._instance = CrossEncoder(cls._model_id, device="cpu", max_length=512)
            except Exception as e:
                print(f"⚠️ Reranker init failed: {e}")
        return cls._instance

    def rerank(self, query: str, documents: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        if not documents:
            return []
            
        try:
            # 1. Generate Raw Scores
            pairs = [[query, doc] for doc in documents]
            scores = self._instance.predict(pairs, batch_size=16)
            
            # 2. SOTA FIX: Use Tuples for sorting
            combined: List[Tuple[str, float]] = []
            for doc, score in zip(documents, scores):
                combined.append((doc, float(score)))

            # 3. Sort by the second element (the float score)
            ranked_tuples = sorted(combined, key=lambda x: x[1], reverse=True)
            
            # 4. Final Packaging
            # We transform our typed tuples into the expected JSON-compatible dictionaries.
            return [
                {"text": d, "score": s} 
                for d, s in ranked_tuples[:top_k]
            ]

        except Exception as e:
            print(f"❌ RERANK PROTOCOL BREACH: {e}")
            return [{"text": d, "score": 0.0} for d in documents[:top_k]]

reranker = AxiomReranker()
