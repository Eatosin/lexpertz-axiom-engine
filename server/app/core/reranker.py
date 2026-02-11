from typing import List, Dict, Any, cast
from flashrank import Ranker, RerankRequest # type: ignore

class AxiomReranker:
    """
    SOTA Reranking Engine (Vercel/Linear Grade).
    Filters semantic noise to prevent LLM hallucination and rate-limit exhaustion.
    """
    _instance: Any = None

    def __new__(cls):
        if cls._instance is None:
            # Initialize the ultra-lightweight ONNX ranker
            cls._instance = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="/tmp")
        return cls._instance

    def rerank(self, query: str, documents: List[str]) -> List[str]:
        # 1. Format for FlashRank requirement
        passages = [{"id": i, "text": doc} for i, doc in enumerate(documents)]
        
        # 2. Execute Rerank logic
        request = RerankRequest(query=query, passages=passages)
        results = self._instance.rerank(request)
        
        # 3. TYPE SAFETY: Cast results to List[Dict] and extract text
        # We take the top 5 most relevant 'Gold' chunks
        data = cast(List[Dict[str, Any]], results)
        
        return [str(result.get('text', '')) for result in data[:5]]

# Global Singleton
reranker = AxiomReranker()
