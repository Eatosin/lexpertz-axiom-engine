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
    Implements Neural Registry Override to prevent 'Unknown Model' exceptions.
    """
    _instance: Optional['EmbeddingAdapter'] = None
    _client: Optional[OpenAI] = None
    _model_name: str = "nvidia/llama-nemotron-embed-1b-v2"
    
    # THE SHIELD: Thread lock for concurrent batching in ingest.py
    _lock: threading.Lock = threading.Lock()

    def __new__(cls) -> 'EmbeddingAdapter':
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
        return cls._instance

    def _force_register_model(self) -> None:
        """
        AXIOM COMMAND: Surgically injects the model into the library's registry.
        Bypasses local validation for the latest Nemotron hardware.
        """
        try:
            from langchain_nvidia_ai_endpoints import _common
            if hasattr(_common, "MODEL_TYPES"):
                # Registering as 'embedding' specialist
                _common.MODEL_TYPES[self._model_name] = "embedding"
                print(f"AXIOM-CORE: Neural Registry Override Successful [{self._model_name}]")
        except Exception as e:
            print(f"Registry Override Notice (Embedding): {e}")

    def _lazy_init(self) -> None:
        """Thread-safe initialization of the NVIDIA client."""
        if self._client is not None:
            return 

        with self._lock:
            if self._client is not None:
                return

            if not NVIDIA_API_KEY:
                raise RuntimeError("CRITICAL: NVIDIA_API_KEY missing.")

            # 1. Execute Override before client initialization
            self._force_register_model()

            print(f"AXIOM-CORE: Multilingual Link Established via {self._model_name}")
            
            # 2. Hardened Client with 5x Retry Backoff for 429 resilience
            self._client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY,
                max_retries=5, 
                timeout=20.0
            )

    def _normalize(self, vector: List[float]) -> List[float]:
        """Mathematically enforces Unit Length (L2 Norm) for pgvector speed."""
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
            target_type = "query" if is_query else "passage"
            
            response = self._client.embeddings.create(
                input=[text],
                model=self._model_name,
                extra_body={
                    "input_type": target_type, 
                    "truncate": "END",
                    "dimensions": 1024 # Forces compatibility with Supabase schema
                }
            )
            raw_vector = response.data[0].embedding
            return self._normalize(raw_vector[:1024])

        except Exception as e:
            print(f"⚠️ NEURAL LINK FAILURE: {str(e)}")
            return [0.0] * 1024 

# Singleton Instance
_engine = EmbeddingAdapter()

def get_embedding(text: str, input_type: str = "query") -> List[float]:
    """Universal thread-safe interface for the Axiom Engine."""
    is_query = True if input_type == "query" else False
    return _engine.embed_text(text, is_query=is_query)
