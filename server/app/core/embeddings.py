import os
import threading
import numpy as np # type: ignore
from typing import List, Any, Optional
from openai import OpenAI

# Configuration - Purged local fallback for V4.5 Cloud-Lean Architecture
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

class EmbeddingAdapter:
    """
    SOTA Cloud-Inference Adapter (V4.6 Thread-Safe).
    Standardized on NVIDIA E5-v5 (1024 dim) with strict L2 Normalization.
    Protected against concurrency race conditions via Thread Locks.
    """
    _instance: Optional['EmbeddingAdapter'] = None
    _client: Optional[OpenAI] = None
    _model_name: str = "nvidia/nv-embedqa-e5-v5"
    
    # 1. THE SHIELD: Thread lock for concurrent batching
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

        # 2. DOUBLE-CHECKED LOCKING: Prevents the 15-thread race condition
        with self._lock:
            if self._client is not None:
                return

            if not NVIDIA_API_KEY:
                raise RuntimeError(
                    "CRITICAL: NVIDIA_API_KEY missing. V4.6 requires Cloud NIM credentials. "
                )

            print(f"AXIOM-CORE: Neural Link Established via {self._model_name} (Thread-Safe)")
            
            # 3. CONCURRENCY ARMOR: Max retries and timeout added for API stability
            self._client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY,
                max_retries=3,  # Native exponential backoff if NIM hits a 429 Rate Limit
                timeout=20.0
            )

    def _normalize(self, vector: List[float]) -> List[float]:
        """
        Mathematically enforces Unit Length (L2 Norm).
        Essential for 'Inner Product' (<#>) speed optimizations in Supabase pgvector.
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
            # NVIDIA E5-v5 Protocol: 'query' for search, 'passage' for document indexing
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
            return self._normalize(raw_vector)

        except Exception as e:
            print(f"NEURAL LINK FAILURE: {str(e)}")
            # Return zero-vector to prevent entire RAG pipeline from crashing
            return [0.0] * 1024 

# Singleton Instance
_engine = EmbeddingAdapter()

def get_embedding(text: str, input_type: str = "query") -> List[float]:
    """
    Standard interface for Axiom Engine.
    Thread-safe and optimized for asyncio.to_thread wrappers.
    """
    is_query = True if input_type == "query" else False
    return _engine.embed_text(text, is_query=is_query)
