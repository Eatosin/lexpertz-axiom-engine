import os
import asyncio
from typing import List, Optional

# Official NVIDIA Integration
from langchain_nvidia_ai_endpoints import NVIDIARerank
from langchain_core.documents import Document

class AxiomReranker:
    """
    SOTA Cloud-Lean Reranker Delegate (V4.6).
    Force-aligned with Nemotron-Rerank-1B-v2.
    Implements Neural Registry Override to bypass library 'Model Unknown' errors.
    """
    _instance = None
    _client: Optional[NVIDIARerank] = None
    # THE TARGET: Exact model slug from your NVIDIA Dashboard
    _model_name: str = "nvidia/llama-nemotron-rerank-1b-v2"

    def __new__(cls) -> 'AxiomReranker':
        if cls._instance is None:
            cls._instance = super(AxiomReranker, cls).__new__(cls)
        return cls._instance

    def _force_register_model(self) -> None:
        """
        AXIOM COMMAND: Surgically injects the model into the library's registry.
        This prevents the 'Model unknown' crash by bypassing local validation.
        """
        try:
            # We reach into the library's internal model mapping
            from langchain_nvidia_ai_endpoints import _common
            # We command the library to treat this model as a ranking specialist
            if hasattr(_common, "MODEL_TYPES"):
                _common.MODEL_TYPES[self._model_name] = "ranking"
                print(f"AXIOM-CORE: Neural Registry Override Successful [{self._model_name}]")
        except Exception as e:
            print(f"⚠️ Registry Override Notice: {e}")

    def _lazy_init(self, top_k: int) -> None:
        """Initializes the Cross-Encoder with forced model recognition."""
        if self._client is None:
            api_key = os.getenv("NVIDIA_API_KEY")
            if not api_key:
                raise RuntimeError("CRITICAL: NVIDIA_API_KEY missing for Reranker.")
            
            # 1. Execute the Registry Override
            self._force_register_model()
            
            print(f"AXIOM-CORE: Materializing {self._model_name}...")
            
            # 2. Initialize with forced configuration
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
            return []
        
        # SOTA OPTIMIZATION: Zero-Latency Short-Circuit
        if len(documents) <= top_k:
            return documents
            
        self._lazy_init(top_k=top_k)
        
        def perform_rerank() -> List[str]:
            if not self._client:
                return documents[:top_k]
            
            # Convert to LangChain primitives
            lc_docs = [Document(page_content=txt) for txt in documents]
            
            # Execute probability scoring via NVIDIA NIM
            # (Now bypasses the 'unknown model' error due to the override)
            compressed_docs = self._client.compress_documents(query=query, documents=lc_docs)
            
            return [doc.page_content for doc in compressed_docs]

        try:
            return await asyncio.to_thread(perform_rerank)
        except Exception as e:
            # Standard AI Guesses, Axiom Proves. 
            # If the prover fails, we log and fall back to vector order.
            print(f"RERANKER FAILSAFE: {e}")
            return documents[:top_k]

# Global Accessor
_reranker_instance = AxiomReranker()

async def get_reranked_scores(query: str, documents: List[str], top_k: int = 10) -> List[str]:
    """Universal async interface for the Librarian Node."""
    return await _reranker_instance.rerank(query, documents, top_k=top_k)
