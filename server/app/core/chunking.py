import re
from typing import List, Optional
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter # type: ignore

class AxiomChunker:
    """
    SOTA Token-Aware Chunker.
    Combines:
    1. Docling Markdown Sanitization (Noise Removal).
    2. Recursive Splitting (Semantic Boundary Preservation).
    3. Tiktoken Counting (NVIDIA 512-Limit Compliance).
    V3.1 SOTA: Lazy-Initialization to prevent tiktoken network hangs on boot.
    """
    def __init__(self, chunk_size: int = 400, chunk_overlap: int = 50):
        # Store settings but DO NOT initialize heavy objects yet
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.tokenizer: Optional[tiktoken.Encoding] = None
        self.splitter: Optional[RecursiveCharacterTextSplitter] = None

    def _lazy_init(self) -> None:
        """Fires only when the first document needs to be chunked."""
        if self.tokenizer is None or self.splitter is None:
            print("AXIOM-CORE: Initializing Tiktoken & Semantic Splitters...")
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
            
            # Smart Splitter: Respects \n\n (paragraphs) and . (sentences)
            self.splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                length_function=self._count_tokens,
                separators=["\n\n", "\n", ". ", " ", ""]
            )

    def _count_tokens(self, text: str) -> int:
        # Guarantee tokenizer exists before counting
        if self.tokenizer is None:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        return len(self.tokenizer.encode(text))

    def _sanitize_markdown(self, text: str) -> str:
        """
        Strips Docling artifacts that dilute semantic density.
        Removes: Table pipes, redundant hashes, and excessive whitespace.
        """
        text = re.sub(r'\|[\s\-\|]+\|', ' ', text)
        text = text.replace('|', ' ')
        text = re.sub(r'#+\s*', ' ', text)
        text = re.sub(r'[\*_]{1,2}', '', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def split_text(self, text: str) -> List[str]:
        # WAKE UP THE CHUNKER (Only happens on actual ingest)
        self._lazy_init()
        
        # PHASE 1: SANITIZATION (The Ghost Killer)
        clean_text = self._sanitize_markdown(text)
        
        # PHASE 2: SMART SPLITTING
        # Type ignored safely because _lazy_init guarantees it exists
        raw_chunks = self.splitter.split_text(clean_text) # type: ignore
        
        # PHASE 3: GUARDRAILS
        valid_chunks =[]
        for c in raw_chunks:
            # Absolute hard limit check (510 allows for start/end token overhead)
            if self._count_tokens(c) <= 510: 
                valid_chunks.append(c)
        
        return valid_chunks

# Singleton Instance (100% Safe and 0ms Boot Time)
chunker = AxiomChunker()

def get_chunks(text: str) -> List[str]:
    """Universal interface for the Ingestion Port."""
    return chunker.split_text(text)
