import os
from typing import List, Any
from sentence_transformers import SentenceTransformer # type: ignore
from langchain_openai import OpenAIEmbeddings # type: ignore

# Configuration
EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "local")  # "local" or "openai"

class EmbeddingAdapter:
    """
    Singleton Adapter that abstracts away the specific AI provider.
    Ensures the rest of the app always gets a List[float] regardless of the model.
    """
    _instance = None
    _model: Any = None # Explicitly typing as Any to handle different library types
    _type: str = "local"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        print(f"Initializing Embedding Engine in [{EMBEDDING_MODE.upper()}] mode...")
        
        if EMBEDDING_MODE == "local":
            # Load Sovereign Model (768 Dimensions)
            self._model = SentenceTransformer('BAAI/bge-large-en-v1.5')
            self._type = "local"
        else:
            # Load Cloud Model
            self._model = OpenAIEmbeddings(model="text-embedding-3-small")
            self._type = "openai"

    def embed_text(self, text: str) -> List[float]:
        """
        Universal method to generate vectors.
        """
        # --- SAFETY CHECK FOR MYPY ---
        if self._model is None:
            raise RuntimeError("Embedding model failed to initialize.")

        if self._type == "local":
            # SentenceTransformer returns numpy array, convert to list
            return self._model.encode(text).tolist()
        else:
            # LangChain OpenAI returns list directly
            return self._model.embed_query(text)

# --- Global Accessor ---
_engine = EmbeddingAdapter()

def get_embedding(text: str) -> List[float]:
    return _engine.embed_text(text)
