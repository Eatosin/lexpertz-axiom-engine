import os
import asyncio
from typing import List, Optional

# SOTA: Official NVIDIA Integration
from langchain_nvidia_ai_endpoints import NVIDIARerank
from langchain_core.documents import Document

class AxiomReranker:
    """
    SOTA Cloud-Lean Reranker Delegate.
    V4.6 Upgrade: Aligned with Nemotron-Rerank-1B-v2 from NVIDIA Dashboard.
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
            
            print("AXIOM-CORE: Materializing Nemotron 1B Cross-Encoder (NVIDIA NIM)...")
            self._client = NVIDIARerank(
                model="nvidia/llama-nemotron-rerank-1b-v2",
                api_key=api_key, # type: ignore
                top_n=top_k
            )
        else:
            # Dynamically update the limit for the current query context
            self._client.top_n = top_k

    async def rerank(self, query: str, documents: List[str], top_k: int = 10) -> List[str]:
        """
        Asynchronously re-scores documents for semantic precision.
        """
        if not documents:
            return []
        
        # SOTA OPTIMIZATION: Zero-Latency Short-Circuit
        # Bypasses network call if result pool is already small.
        if len(documents) <= top_k:
            return documents
            
        self._lazy_init(top_k=top_k)
        
        def perform_rerank() -> List[str]:
            if not self._client:
                return documents[:top_k]
            
            # 1. Convert to LangChain primitives
            lc_docs = [Document(page_content=txt) for txt in documents]
            
            # 2. Compute probability scores via NVIDIA NIM
            compressed_docs = self._client.compress_documents(query=query, documents=lc_docs)
            
            # 3. Return the re-ordered results
            return [doc.page_content for doc in compressed_docs]

        try:
            # Offload heavy network matrix calculation to background thread
            return await asyncio.to_thread(perform_rerank)
        except Exception as e:
            # THE FAILSAFE: Standard AI Guesses, Axiom Proves. 
            # If the prover is offline, we fall back to the vector guess.
            print(f"RERANKER FAILSAFE (Nemotron): {e}")
            return documents[:top_k]

# Global Accessor
_reranker_instance = AxiomReranker()

async def get_reranked_scores(query: str, documents: List[str], top_k: int = 10) -> List[str]:
    """Universal async interface for the Librarian Node."""
    return await _reranker_instance.rerank(query, documents, top_k=top_k)
