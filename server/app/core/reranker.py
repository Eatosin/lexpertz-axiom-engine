from flashrank import Ranker, RerankRequest # type: ignore
from typing import List, Dict, Any, cast

class AxiomReranker:
    """
    SOTA Enterprise Reranker.
    Primary: BGE-Reranker-Large (Precision Tier).
    Fallback: MiniLM-L-12 (Speed Tier).
    """
    _instance: Any = None
    _model_name = "BAAI/bge-reranker-large"

    def __new__(cls):
        if cls._instance is None:
            try:
                print(f"AXIOM-CORE: Initializing {cls._model_name}...")
                cls._instance = Ranker(
                    model_name=cls._model_name,
                    cache_dir="/tmp/flashrank",
                    max_length=512
                )
            except Exception as e:
                print(f"⚠️ INFRA-WARNING: Falling back to MiniLM due to resource constraints: {e}")
                cls._instance = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="/tmp")
        return cls._instance

    def rerank(self, query: str, documents: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        if not documents:
            return []
        try:
            passages = [{"id": i, "text": doc} for i, doc in enumerate(documents)]
            req = RerankRequest(query=query, passages=passages)
            results = self._instance.rerank(req)
            
            # Type-safe sorting of results by relevance score
            data = cast(List[Dict[str, Any]], results)
            return sorted(data, key=lambda x: x.get("score", 0), reverse=True)[:top_k]
        except Exception as e:
            print(f"❌ RERANK FAILURE: {e}. Reverting to standard retrieval.")
            return [{"id": i, "text": doc, "score": 0.0} for i, doc in enumerate(documents[:top_k])]

reranker = AxiomReranker()
