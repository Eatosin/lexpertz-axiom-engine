import re
import asyncio
from typing import List, Optional
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter

class AxiomChunker:
    """
    SOTA Token-Aware Chunker (V4.6 Enterprise).
    Preserves structural Markdown (Tables/Headers) for Financial/Legal accuracy.
    Includes async offloading to prevent GIL freezes on massive PDFs.
    """
    def __init__(self, chunk_size: int = 400, chunk_overlap: int = 50):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
        self.tokenizer: Optional[tiktoken.Encoding] = None
        self.splitter: Optional[RecursiveCharacterTextSplitter] = None

    def _lazy_init(self) -> None:
        """Fires only when the first document needs to be chunked."""
        if self.tokenizer is None or self.splitter is None:
            print("AXIOM-CORE: Initializing Tiktoken & Semantic Splitters...")
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
            
            # SOTA Splitter: Respects structural boundaries
            self.splitter = RecursiveCharacterTextSplitter(
                chunk_size=self.chunk_size,
                chunk_overlap=self.chunk_overlap,
                length_function=self._count_tokens,
                # Prioritize splitting on double newlines to keep table rows intact
                separators=["\n\n", "\n", ". ", " ", ""]
            )

    def _count_tokens(self, text: str) -> int:
        if self.tokenizer is None:
            self.tokenizer = tiktoken.get_encoding("cl100k_base")
        return len(self.tokenizer.encode(text))

    def _sanitize_markdown(self, text: str) -> str:
        """
        SOTA Preservative Sanitization:
        Strips invisible/junk characters but STRICTLY PRESERVES tables, 
        lists, and headers which are vital for vector semantics.
        """
        # Remove massive blocks of empty newlines (e.g., page breaks)
        text = re.sub(r'\n{3,}', '\n\n', text)
        # Remove zero-width spaces and weird unicode artifacts
        text = text.replace('\u200b', '').replace('\ufeff', '')
        # Clean trailing whitespace on lines without destroying the line itself
        text = re.sub(r'[ \t]+$', '', text, flags=re.MULTILINE)
        return text.strip()

    def split_text(self, text: str) -> List[str]:
        """Synchronous split (Internal use)"""
        self._lazy_init()
        
        # PHASE 1: PRESERVATIVE SANITIZATION
        clean_text = self._sanitize_markdown(text)
        
        # PHASE 2: SMART SPLITTING
        if not self.splitter:
            raise RuntimeError("Splitter failed to initialize")
            
        raw_chunks = self.splitter.split_text(clean_text)
        
        # PHASE 3: GUARDRAILS (NVIDIA NIM 512-Token Limit Compliance)
        valid_chunks =[]
        for c in raw_chunks:
            # 510 allows 2 tokens overhead for embedding engine system prompts
            if self._count_tokens(c) <= 510: 
                valid_chunks.append(c)
        
        return valid_chunks

    async def asplit_text(self, text: str) -> List[str]:
        """
        Async wrapper: Offloads heavy CPU tokenization to a background thread.
        Prevents FastAPI event loop starvation when parsing 100+ page PDFs.
        """
        return await asyncio.to_thread(self.split_text, text)


# Singleton Instance
chunker = AxiomChunker()

def get_chunks(text: str) -> List[str]:
    """Universal synchronous interface."""
    return chunker.split_text(text)

async def aget_chunks(text: str) -> List[str]:
    """Universal async interface for the Ingestion Port."""
    return await chunker.asplit_text(text)
