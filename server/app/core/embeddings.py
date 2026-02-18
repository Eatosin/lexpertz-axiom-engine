import os
import numpy as np # type: ignore
from typing import List, Any, Optional
from openai import OpenAI

# Configuration
EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "nvidia")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

class EmbeddingAdapter:
    """
    SOTA Multi-Provider Hub.
    Standardized on NVIDIA E5-v5 (1024 dim) with L2 Normalization.
    """
    _instance: Optional['EmbeddingAdapter'] = None
    _client: Any = None
    
    # THE GOLD STANDARD MODEL (1024 Dimensions)
    _model_name: str = "nvidia/nv-embedqa-e5-v5"
    _type: str = "nvidia"

    def __new__(cls) -> 'EmbeddingAdapter':
        if cls._instance is None:
            cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self) -> None:
        if EMBEDDING_MODE == "nvidia" and NVIDIA_API_KEY:
            print(f"AXIOM-CORE: Connecting to GPU Grid via {self._model_name}")
            self._client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY
            )
            self._type = "nvidia"
        else:
            print("AXIOM-CORE: Loading Local Sovereign Model...")
            from sentence_transformers import SentenceTransformer
            # Fallback to a 1024-dim compatible model or handle resize
            # For simplicity in fallback, we assume user knows to switch DB or use compatible model
            self._client = SentenceTransformer('BAAI/bge-large-en-v1.5') # 1024 dim
            self._type = "local"

    def _normalize(self, vector: List[float]) -> List[float]:
        """
        Mathematically enforces Unit Length (L2 Norm).
        Required for accurate Cosine Similarity in pgvector.
        """
        arr = np.array(vector)
        norm = np.linalg.norm(arr)
        if norm == 0:
            return vector
        return (arr / norm).tolist()

    def embed_text(self, text: str, input_type: str = "passage") -> List[float]:
        if self._client is None:
            raise RuntimeError("Intelligence Core Offline.")

        raw_vector = []
        try:
            if self._type == "nvidia":
                # E5-v5 expects 'query' or 'passage'
                target_type = "query" if input_type == "query" else "passage"
                
                response = self._client.embeddings.create(
                    input=[text],
                    model=self._model_name,
                    extra_body={
                        "input_type": target_type, 
                        "truncate": "END"
                    }
                )
                raw_vector = response.data[0].embedding
            else:
                raw_vector = self._client.encode(text).tolist()
            
            # CRITICAL: Normalize or search fails
            return self._normalize(raw_vector)

        except Exception as e:
            print(f"⚠️ NEURAL LINK FAILURE: {str(e)}")
            # Return zero-vector of correct dimension (1024) to prevent crash
            return [0.0] * 1024 

_engine = EmbeddingAdapter()

def get_embedding(text: str, input_type: str = "document") -> List[float]:
    # Map generic types to E5 specific types
    if input_type == "document":
        return _engine.embed_text(text, "passage")
    return _engine.embed_text(text, "query")
