import os
from typing import List, Any, cast
from sentence_transformers import SentenceTransformer # type: ignore
from langchain_openai import OpenAIEmbeddings # type: ignore

EMBEDDING_MODE = os.getenv("EMBEDDING_MODE", "local")

class EmbeddingAdapter:
    _instance = None
    _model: Any = None
    _type: str = "local"

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(EmbeddingAdapter, cls).__new__(cls)
            cls._instance._initialize_model()
        return cls._instance

    def _initialize_model(self):
        if EMBEDDING_MODE == "local":
            # LOAD: BGE-Large (1024 Dimensions)
            self._model = SentenceTransformer('BAAI/bge-large-en-v1.5')
            self._type = "local"
        else:
            # LOAD: OpenAI (1536 Dimensions)
            # Note: If switching to OpenAI later, you must run another SQL strike to set 1536
            self._model = OpenAIEmbeddings(model="text-embedding-3-small")
            self._type = "openai"

    def embed_text(self, text: str) -> List[float]:
        if self._model is None:
            raise RuntimeError("Neural core failed to initialize.")

        if self._type == "local":
            return self._model.encode(text).tolist()
        else:
            return self._model.embed_query(text)

_engine = EmbeddingAdapter()

def get_embedding(text: str) -> List[float]:
    return _engine.embed_text(text)
