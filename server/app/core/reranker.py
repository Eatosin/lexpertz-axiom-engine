import os
from typing import List, Dict, Any, cast
from sentence_transformers import CrossEncoder # type: ignore

class AxiomReranker:
    """
    High-Precision Cross-Encoder.
    Ensures 10-K financial notes are accurately ranked for the Auditor Node.
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
        if not documents: return []
        try:
            pairs = [[query, doc] for doc in documents]
            scores = self._instance.predict(pairs, batch_size=16)
            
            ranked = []
            for doc, score in zip(documents, scores):
                ranked.append({"text": doc, "score": float(score)})
            
            return sorted(ranked, key=lambda x: x["score"], reverse=True)[:top_k]
        except Exception:
            return [{"text": d, "score": 0.0} for d in documents[:top_k]]

reranker = AxiomReranker()
