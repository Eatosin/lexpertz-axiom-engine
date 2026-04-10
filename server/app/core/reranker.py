import os
import asyncio
from typing import List, Optional

# SOTA: Official NVIDIA Integration
from langchain_nvidia_ai_endpoints import NVIDIARerank
from langchain_core.documents import Document

class AxiomReranker:
    """
    SOTA Cloud-Lean Reranker Delegate.
    V4.6 Upgrade: Integrates NVIDIA NIM Mistral-4B Cross-Encoder natively.
    Includes Async offloading and a Zero-Latency Short-Circuit.
    """
    _instance = None
    _client: Optional[NVIDIARerank] = None

    def __new__(cls) -> 'AxiomReranker':
        if cls._instance is None:
            cls._instance = super(AxiomReranker, cls).__new__(cls)
        return cls._instance

    def _lazy_init(self, top_k: int) -> None:
        """Initializes the Cross-Encoder only when needed."""
        if self._client is None:
            api_key = os.getenv("NVIDIA_API_KEY")
            if not api_key:
                raise RuntimeError("CRITICAL: NVIDIA_API_KEY missing for Reranker.")
            
            print("AXIOM-CORE: Materializing Mistral 4B Cross-Encoder (NVIDIA NIM)...")
            self._client = NVIDIARerank(
                model="nvidia/nv-rerankqa-mistral4b-v3",
                api_key=api_key, # type: ignore
                top_n=top_k
            )
        else:
            # Dynamically adjust top_k for different search scopes
            self._client.top_n = top_k

    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> List[str]:
        if not documents:
            return[]
        
        # SOTA OPTIMIZATION: The Short-Circuit
        # If the vector database only found 8 documents and we want top 10,
        # there is no point paying for the Reranker. Just return them.
        if len(documents) <= top_k:
            return documents
            
        self._lazy_init(top_k=top_k)
        
        def perform_rerank() -> List[str]:
            if not self._client:
                return documents[:top_k]
            
            # 1. Convert raw strings to LangChain Document objects
            lc_docs =[Document(page_content=txt) for txt in documents]
            
            # 2. Execute Cross-Encoder calculation (Synchronous blocking call)
            compressed_docs = self._client.compress_documents(query=query, documents=lc_docs)
            
            # 3. Extract the re-ordered strings
            return[doc.page_content for doc in compressed_docs]

        try:
            # Offload the heavy network call to a background thread
            return await asyncio.to_thread(perform_rerank)
        except Exception as e:
            # THE FAILSAFE: If NVIDIA is down or rate-limited, DO NOT CRASH.
            # Gracefully fallback to the original Vector Database ordering.
            print(f"⚠️ RERANKER FAILSAFE TRIGGERED: {e}")
            return documents[:top_k]

# Global Accessor
_reranker_instance = AxiomReranker()

async def get_reranked_scores(query: str, documents: List[str], top_k: int = 10) -> List[str]:
    """Universal async interface for the Librarian Node."""
    return await _reranker_instance.rerank(query, documents, top_k=top_k)
