from typing import List
from langchain_text_splitters import RecursiveCharacterTextSplitter

class Chunker:
    """
    Splits long documents into digestible 'Evidence Blocks' for the AI.
    Standard: 1000 characters with 200 character overlap to maintain context.
    """
    def __init__(self, chunk_size=1000, chunk_overlap=200):
        self.splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", ".", " ", ""]
        )

    def split_text(self, text: str) -> List[str]:
        return self.splitter.split_text(text)

# Singleton Accessor
chunker = Chunker()
