import os
from typing import List, Any, Optional
from openai import OpenAI # Using native OpenAI client for maximum stability

# Configuration
EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "nvidia")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

class EmbeddingAdapter:
    """
    SOTA Multi-Provider Hub.
    Fixed: Corrected NVIDIA NIM endpoint paths to resolve 404 errors.
    """
    _instance: Optional['EmbeddingAdapter'] = None
    _client: Any = None
    _model_name: str = "nvidia/llama-nemotron-embed-v1-1b-v2" 
    _type: str = "nvidia"

    def __new__(cls) -> 'EmbeddingAdapter':
        if cls._instance is None:
            cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self) -> None:
        if EMBEDDING_MODE == "nvidia" and NVIDIA_API_KEY:
            print(f"AXIOM-CORE: Connecting to GPU Grid via {self._model_name}")
            # Standard NVIDIA NIM Base URL
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

    def embed_text(self, text: str) -> List[float]:
        if self._client is None:
            raise RuntimeError("Intelligence Core Offline.")

        try:
            if self._type == "nvidia":
                # Using the native NIM protocol to bypass 404s
                response = self._client.embeddings.create(
                    input=[text],
                    model=self._model_name,
                    extra_body={"input_type": "query", "truncate": "NONE"}
                )
                return response.data[0].embedding
            else:
                return self._client.encode(text).tolist()
        except Exception as e:
            print(f"⚠️ NEURAL LINK FAILURE: {str(e)}")
            # Critical fallback to 0-vector to prevent pipeline crash
            return [0.0] * 1024 

_engine = EmbeddingAdapter()

def get_embedding(text: str) -> List[float]:
    return _engine.embed_text(text)
