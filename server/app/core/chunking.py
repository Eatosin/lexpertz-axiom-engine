from typing import List
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter # type: ignore

class Chunker:
    """
    SOTA Token-Aware Chunker.
    Uses precise Tiktoken counting to ensure 100% compatibility with NVIDIA's 512-token limit.
    """
    def __init__(self, chunk_size: int = 400, chunk_overlap: int = 50):
        # We target 400 tokens to ensure we never hit the 512 limit
        # 'cl100k_base' is the standard tokenizer for modern LLMs/Embeddings
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=self._count_tokens,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def _count_tokens(self, text: str) -> int:
        return len(self.tokenizer.encode(text))

    def split_text(self, text: str) -> List[str]:
        raw_chunks = self.splitter.split_text(text)
        
        # Double-Check Guard: Filter out any anomalies that might slip through
        valid_chunks = []
        for c in raw_chunks:
            # Absolute hard limit check (510 allows for start/end token overhead)
            if self._count_tokens(c) <= 510: 
                valid_chunks.append(c)
        
        return valid_chunks

chunker = Chunker()
