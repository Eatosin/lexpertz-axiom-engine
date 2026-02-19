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
    
    _model_name: str = "nvidia/nv-embedqa-e5-v5"
    _type: str = "nvidia"

    def __new__(cls) -> 'EmbeddingAdapter':
        if cls._instance is None:
            cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self) -> None:
        if EMBEDDING_MODE == "nvidia" and NVIDIA_API_KEY:
            # Check for "NVIDIA_API_KEY" specifically to prevent empty string crashes
            print(f"AXIOM-CORE: Connecting to GPU Grid via {self._model_name}")
            self._client = OpenAI(
                base_url="https://integrate.api.nvidia.com/v1",
                api_key=NVIDIA_API_KEY
            )
            self._type = "nvidia"
        else:
            print("AXIOM-CORE: Loading Local Sovereign Model (Fallback)...")
            from sentence_transformers import SentenceTransformer
            self._client = SentenceTransformer('BAAI/bge-large-en-v1.5') 
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

    def embed_text(self, text: str, is_query: bool = False) -> List[float]:
        if self._client is None:
            raise RuntimeError("Intelligence Core Offline.")

        try:
            if self._type == "nvidia":
                # E5-v5 MANDATORY: 'query' for search, 'passage' for indexing
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
                
                # Debugging: Log the normalization and type (Remove in production)
                 print(f"DEBUG: Type={target_type}, RawNorm={np.linalg.norm(raw_vector):.4f}")
                
            else:
                # Local fallback logic
                raw_vector = self._client.encode(text).tolist()
            
            return self._normalize(raw_vector)

        except Exception as e:
            print(f"⚠️ NEURAL LINK FAILURE: {str(e)}")
            # Return zero-vector of correct dimension (1024) to prevent downstream crash
            return [0.0] * 1024 

# Singleton Instance
_engine = EmbeddingAdapter()

def get_embedding(text: str, input_type: str = "query") -> List[float]:
    """
    Standard interface for Axiom Engine.
    Defaults to 'query' to prevent the common retrieval-miss bug.
    """
    # Force boolean mapping to prevent string mismatch
    is_query = True if input_type == "query" else False
    return _engine.embed_text(text, is_query=is_query)
