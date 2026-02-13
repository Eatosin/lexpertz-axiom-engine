import os
from typing import List, Dict, Any, cast
from flashrank import Ranker, RerankRequest # type: ignore

class AxiomReranker:
    """
    SOTA Reranking Engine (HF CPU Stable).
    Standardized on MiniLM-L-12 for sub-second latency on shared hardware.
    """
    _instance: Any = None

    def __new__(cls):
        if cls._instance is None:
            # SOTA: Explicit cache path for Hugging Face persistent storage
            cache = "/tmp/flashrank"
            os.makedirs(cache, exist_ok=True)
            
            # Using the officially supported lightweight model
            cls._instance = Ranker(
                model_name="ms-marco-MiniLM-L-12-v2", 
                cache_dir=cache
            )
        return cls._instance

    def rerank(self, query: str, documents: List[str], top_k: int = 5) -> List[str]:
        if not documents:
            return []
        
        try:
            # 1. Format passages for the protocol
            passages = [{"id": i, "text": doc} for i, doc in enumerate(documents)]
            
            # 2. SOTA: Use the explicit Request Object to prevent argument errors
            req = RerankRequest(query=query, passages=passages)
            results = self._instance.rerank(req)
            
            # 3. Type Safe extraction of Top-K results
            data = cast(List[Dict[str, Any]], results)
            
            # Return only the 'Gold' text chunks
            return [str(result.get('text', '')) for result in data[:top_k]]
            
        except Exception as e:
            print(f"⚠️ Reranker Protocol Interrupted: {e}. Falling back to raw retrieval.")
            return documents[:top_k]

# Global Singleton
reranker = AxiomReranker()
