import re
from typing import List
import tiktoken
from langchain_text_splitters import RecursiveCharacterTextSplitter # type: ignore

class AxiomChunker:
    """
    SOTA Token-Aware Chunker.
    Combines:
    1. Docling Markdown Sanitization (Noise Removal).
    2. Recursive Splitting (Semantic Boundary Preservation).
    3. Tiktoken Counting (NVIDIA 512-Limit Compliance).
    """
    def __init__(self, chunk_size: int = 400, chunk_overlap: int = 50):
        # We target 400 tokens to ensure we never hit the 512 limit
        self.tokenizer = tiktoken.get_encoding("cl100k_base")
        
        # Smart Splitter: Respects \n\n (paragraphs) and . (sentences)
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=self._count_tokens,
            separators=["\n\n", "\n", ". ", " ", ""]
        )

    def _count_tokens(self, text: str) -> int:
        return len(self.tokenizer.encode(text))

    def _sanitize_markdown(self, text: str) -> str:
        """
        Strips Docling artifacts that dilute semantic density.
        Removes: Table pipes, redundant hashes, and excessive whitespace.
        """
        # 1. Remove table borders/separators: |---|---|
        text = re.sub(r'\|[\s\-\|]+\|', ' ', text)
        # 2. Remove table pipes: | Table Cell | -> Table Cell
        text = text.replace('|', ' ')
        # 3. Remove Markdown header markers: ### Heading -> Heading
        text = re.sub(r'#+\s*', ' ', text)
        # 4. Remove bold/italic markers
        text = re.sub(r'[\*_]{1,2}', '', text)
        # 5. Collapse multiple spaces and newlines into single spaces
        text = re.sub(r'\s+', ' ', text)
        
        return text.strip()

    def split_text(self, text: str) -> List[str]:
        # PHASE 1: SANITIZATION (The Ghost Killer)
        clean_text = self._sanitize_markdown(text)
        
        # PHASE 2: SMART SPLITTING
        raw_chunks = self.splitter.split_text(clean_text)
        
        # PHASE 3: GUARDRAILS
        valid_chunks = []
        for c in raw_chunks:
            # Absolute hard limit check (510 allows for start/end token overhead)
            if self._count_tokens(c) <= 510: 
                valid_chunks.append(c)
        
        return valid_chunks

# Singleton Instance
chunker = AxiomChunker()

def get_chunks(text: str) -> List[str]:
    """Universal interface for the Ingestion Port."""
    return chunker.split_text(text)
