import os
from typing import List
from sentence_transformers import SentenceTransformer
from langchain_openai import OpenAIEmbeddings

# Configuration
EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "local")  # "local" or "openai"

class EmbeddingAdapter:
    """
    Singleton Adapter that abstracts away the specific AI provider.
    Ensures the rest of the app always gets a List[float] regardless of the model.
    """
    _instance = None
    _model = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        print(f"Initializing Embedding Engine in [{EMBEDDING_MODE.upper()}] mode...")
        
        if EMBEDDING_MODE == "local":
            # Load Sovereign Model (768 Dimensions)
            # Uses CPU-friendly version for server stability
            self._model = SentenceTransformer('BAAI/bge-large-en-v1.5')
            self._type = "local"
        else:
            # Load Cloud Model
            # Note: Ensure API Key is in .env
            self._model = OpenAIEmbeddings(model="text-embedding-3-small")
            self._type = "openai"

    def embed_text(self, text: str) -> List[float]:
        """
        Universal method to generate vectors.
        """
        if self._type == "local":
            # SentenceTransformer returns numpy array, convert to list
            return self._model.encode(text).tolist()
        else:
            # LangChain OpenAI returns list directly
            return self._model.embed_query(text)

# --- Global Accessor ---
# The app will call this function, keeping the class logic private.
_engine = EmbeddingAdapter()

def get_embedding(text: str) -> List[float]:
    return _engine.embed_text(text)
