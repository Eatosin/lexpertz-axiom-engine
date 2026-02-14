import os
from typing import List, Any, Optional
from langchain_openai import OpenAIEmbeddings # type: ignore

# Environment Standard
EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "nvidia")
NVIDIA_API_KEY = os.getenv("NVIDIA_API_KEY")

class EmbeddingAdapter:
    """
    SOTA Multi-Provider Hub.
    Primary: NVIDIA NIM (GPU Accelerated).
    Fallback: BGE-Large (Local CPU).
    """
    _instance: Optional['EmbeddingAdapter'] = None
    _model: Any = None
    _type: str = "nvidia"

    def __new__(cls) -> 'EmbeddingAdapter':
        if cls._instance is None:
            cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self) -> None:
        if EMBEDDING_MODE == "nvidia" and NVIDIA_API_KEY:
            print("AXIOM-CORE: Linking to NVIDIA NIM Grid...")
            self._model = OpenAIEmbeddings(
                model="nvidia/llama-nemotron-embed-v1-1b-v2",
                openai_api_key=NVIDIA_API_KEY,
                openai_api_base="https://integrate.api.nvidia.com/v1"
            )
            self._type = "nvidia"
        else:
            print("AXIOM-CORE: Initializing Local Sovereign Embeddings...")
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer('BAAI/bge-large-en-v1.5')
            self._type = "local"

    def embed_text(self, text: str) -> List[float]:
        if self._model is None:
            raise RuntimeError("Intelligence Core Offline.")

        if self._type == "nvidia":
            return self._model.embed_query(text)
        else:
            return self._model.encode(text).tolist()

_engine = EmbeddingAdapter()

def get_embedding(text: str) -> List[float]:
    return _engine.embed_text(text)
