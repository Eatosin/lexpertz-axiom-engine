import os
import threading
import numpy as np # type: ignore
from typing import List, Any, Optional
from openai import OpenAI

# Configuration - Sovereign Cloud-Lean Architecture
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

class EmbeddingAdapter:
    """
    SOTA Multilingual Inference Adapter (V4.6 Thread-Safe).
    Upgraded to Llama-Nemotron-Embed-1B-v2 for global sovereign audits.
    Supports 26 languages including French, Arabic, Chinese, and Spanish.
    """
    _instance: Optional['EmbeddingAdapter'] = None
    _client: Optional[OpenAI] = None
    # SOTA: Multilingual model ID from NVIDIA Dashboard
    _model_name: str = "nvidia/llama-nemotron-embed-1b-v2"
    
    # THE SHIELD: Thread lock for concurrent batching in ingest.py
    _lock: threading.Lock = threading.Lock()

    def __new__(cls) -> 'EmbeddingAdapter':
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
        return cls._instance

    def _lazy_init(self) -> None:
        """Thread-safe initialization of the NVIDIA client."""
        if self._client is not None:
            return 

        with self._lock:
            if self._client is not None:
                return

            if not NVIDIA_API_KEY:
                raise RuntimeError("CRITICAL: NVIDIA_API_KEY missing.")

            print(f"AXIOM-CORE: Multilingual Link Established via {self._model_name}")
            
            self._client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY,
                max_retries=3,
                timeout=20.0
            )

    def _normalize(self, vector: List[float]) -> List[float]:
        """
        Mathematically enforces Unit Length (L2 Norm).
        Essential for 'Inner Product' (<#>) speed optimizations in Supabase.
        """
        arr = np.array(vector)
        norm = np.linalg.norm(arr)
        if norm == 0:
            return vector
        return (arr / norm).tolist()

    def embed_text(self, text: str, is_query: bool = False) -> List[float]:
        """Transmits text to NVIDIA grid and returns a normalized 1024-D vector."""
        self._lazy_init()
        
        if self._client is None:
            return [0.0] * 1024

        try:
            # Nemotron Protocol: 'query' for search, 'passage' for document indexing
            target_type = "query" if is_query else "passage"
            
            response = self._client.embeddings.create(
                input=[text],
                model=self._model_name,
                extra_body={
                    "input_type": target_type, 
                    "truncate": "END"
                }
            )
            raw_vector = response.data[0].embedding
            
            # Ensure output is strictly 1024-D before normalization
            # Nemotron 1B natively supports 1024, but we slice for absolute safety
            return self._normalize(raw_vector[:1024])

        except Exception as e:
            print(f"⚠️ NEURAL LINK FAILURE: {str(e)}")
            return [0.0] * 1024 

# Singleton Instance
_engine = EmbeddingAdapter()

def get_embedding(text: str, input_type: str = "query") -> List[float]:
    """
    Standard interface for Axiom Engine.
    Maps 'query' or 'document/passage' to appropriate input_types.
    """
    is_query = True if input_type == "query" else False
    return _engine.embed_text(text, is_query=is_query)
