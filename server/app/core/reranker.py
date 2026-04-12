import os
import asyncio
from typing import List, Optional

# Official NVIDIA Integration 
from langchain_nvidia_ai_endpoints import NVIDIARerank
from langchain_core.documents import Document

class AxiomReranker:
    """
    SOTA Cloud-Lean Reranker Delegate (V4.6).
    Aligned with 'nvidia/rerank-qa-mistral-4b' (Hosted Free Endpoint).
    Provides elite English cross-encoder precision with zero local GPU cost.
    """
    _instance = None
    _client: Optional[NVIDIARerank] = None
    # THE TARGET: Exact Cloud API Slug
    _model_name: str = "nvidia/rerank-qa-mistral-4b"

    def __new__(cls) -> 'AxiomReranker':
        if cls._instance is None:
            cls._instance = super(AxiomReranker, cls).__new__(cls)
        return cls._instance

    def _lazy_init(self, top_k: int) -> None:
        """Initializes the Cross-Encoder via NVIDIA Cloud endpoints."""
        if self._client is None:
            api_key = os.getenv("NVIDIA_API_KEY")
            if not api_key:
                raise RuntimeError("CRITICAL: NVIDIA_API_KEY missing for Reranker.")
            
            print(f"AXIOM-CORE: Materializing {self._model_name} (Cloud Endpoint)...")
            
            self._client = NVIDIARerank(
                model=self._model_name,
                api_key=api_key, # type: ignore
                top_n=top_k
            )
        else:
            self._client.top_n = top_k

    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> List[str]:
        """Asynchronously re-scores documents for semantic precision."""
        if not documents:
            return[]
        
        # SOTA OPTIMIZATION: Zero-Latency Short-Circuit
        if len(documents) <= top_k:
            return documents
            
        self._lazy_init(top_k=top_k)
        
        def perform_rerank() -> List[str]:
            if not self._client:
                return documents[:top_k]
            
            # 1. Convert to LangChain primitives
            lc_docs = [Document(page_content=txt) for txt in documents]
            
            # 2. Compute probability scores via NVIDIA NIM Cloud
            compressed_docs = self._client.compress_documents(query=query, documents=lc_docs)
            
            # 3. Return the re-ordered strings
            return [doc.page_content for doc in compressed_docs]

        try:
            # Offload heavy network call to background thread
            return await asyncio.to_thread(perform_rerank)
        except Exception as e:
            # THE FAILSAFE: If NVIDIA rate-limits the Free Endpoint, DO NOT CRASH.
            # Gracefully fallback to the original Vector Database ordering.
            print(f"⚠️ RERANKER CLOUD FAILSAFE TRIGGERED: {e}")
            return documents[:top_k]

# Global Accessor
_reranker_instance = AxiomReranker()

async def get_reranked_scores(query: str, documents: List[str], top_k: int = 10) -> List[str]:
    """Universal async interface for the Librarian Node."""
    return await _reranker_instance.rerank(query, documents, top_k=top_k)
