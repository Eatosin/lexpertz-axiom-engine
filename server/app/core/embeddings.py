import os
from typing import List, Any, Optional
from openai import OpenAI

# Configuration
EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "nvidia")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

class EmbeddingAdapter:
    """
    SOTA Multi-Provider Hub.
    Engineered for NVIDIA NIM 512-token constraints using native truncation.
    """
    _instance: Optional['EmbeddingAdapter'] = None
    _client: Any = None
    
    # CORRECTED: Keeping the 1024-dim model that matches your Supabase Schema
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
            self._client = SentenceTransformer('BAAI/bge-large-en-v1.5')
            self._type = "local"

    def embed_text(self, text: str, input_type: str = "passage") -> List[float]:
        if self._client is None:
            raise RuntimeError("Intelligence Core Offline.")

        try:
            if self._type == "nvidia":
                # Map internal type to NVIDIA E5 specific requirements
                target_type = "query" if input_type == "query" else "passage"
                
                response = self._client.embeddings.create(
                    input=[text],
                    model=self._model_name,
                    extra_body={
                        "input_type": target_type, 
                        "truncate": "END" # SOTA Safety: Prevents 400 Errors
                    }
                )
                return response.data[0].embedding
            else:
                return self._client.encode(text).tolist()
        except Exception as e:
            print(f"⚠️ NEURAL LINK FAILURE: {str(e)}")
            # Fallback to zero-vector to keep pipeline alive (1024 dims)
            return [0.0] * 1024 

_engine = EmbeddingAdapter()

def get_embedding(text: str, input_type: str = "document") -> List[float]:
    return _engine.embed_text(text, input_type)
