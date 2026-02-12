from typing import List, Dict, Any, cast
from flashrank import Ranker # type: ignore

class AxiomReranker:
    """
    SOTA Reranking Engine.
    Refactored to use Positional Arguments to solve the 'unexpected keyword' 
    error found in Hugging Face production logs.
    """
    _instance: Any = None

    def __new__(cls):
        if cls._instance is None:
            # Initialize the ultra-lightweight ONNX ranker
            cls._instance = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="/tmp")
        return cls._instance

    def rerank(self, query: str, documents: List[str]) -> List[str]:
        if not documents:
            return []

        # 1. Format passages for FlashRank (List of Dicts)
        passages = [{"id": i, "text": doc} for i, doc in enumerate(documents)]
        
        # instead of using the RerankRequest keyword wrapper.
        results = self._instance.rerank(query, passages)
        
        # 3. Type Safe extraction of Top 5 'Gold' chunks
        data = cast(List[Dict[str, Any]], results)
        
        return [str(result.get('text', '')) for result in data[:5]]

# Global Singleton Accessor
reranker = AxiomReranker()
