import os
import asyncio
from typing import List, Optional
from langchain_nvidia_ai_endpoints import NVIDIARerank
from langchain_core.documents import Document

class AxiomReranker:
    """
    SOTA Cloud-Lean Reranker Delegate (V4.6.1).
    Engineered for Nemotron-Multilingual Synergy.
    """
    _instance = None
    _client: Optional[NVIDIARerank] = None
    # THE VERIFIED SLUG:
    _model_name: str = "nvidia/llama-nemotron-rerank-1b-v2"

    def __new__(cls) -> 'AxiomReranker':
        if cls._instance is None:
            cls._instance = super(AxiomReranker, cls).__new__(cls)
        return cls._instance

    def _lazy_init(self, top_k: int) -> None:
        if self._client is None:
            api_key = os.getenv("NVIDIA_API_KEY")
            if not api_key:
                raise RuntimeError("CRITICAL: NVIDIA_API_KEY missing.")
            
            print(f"AXIOM-CORE: Materializing {self._model_name}...")
            
            self._client = NVIDIARerank(
                model=self._model_name,
                api_key=api_key, # type: ignore
                top_n=top_k
            )
        else:
            self._client.top_n = top_k

    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> List[str]:
        if not documents: return []
        if len(documents) <= top_k: return documents
            
        self._lazy_init(top_k=top_k)
        
        def perform_rerank() -> List[str]:
            if not self._client: return documents[:top_k]
            lc_docs = [Document(page_content=txt) for txt in documents]
            compressed_docs = self._client.compress_documents(query=query, documents=lc_docs)
            return [doc.page_content for doc in compressed_docs]

        try:
            return await asyncio.to_thread(perform_rerank)
        except Exception as e:
            print(f"⚠️ RERANKER FAILSAFE: {e}")
            return documents[:top_k]

_reranker_instance = AxiomReranker()

async def get_reranked_scores(query: str, documents: List[str], top_k: int = 10) -> List[str]:
    return await _reranker_instance.rerank(query, documents, top_k=top_k)
