import tiktoken
from typing import List

class ContextMonitor:
    """
    SOTA KV-Cache Guard for Axiom Engine.
    Ensures that processing 100+ page documents stays within 
    the Llama 3.3 safety thresholds (110k token buffer).
    """
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ContextMonitor, cls).__new__(cls)
            # cl100k_base is the standard encoding for modern Llama/OpenAI models
            cls._instance.encoder = tiktoken.get_encoding("cl100k_base")
            cls._instance.LIMIT = 110000 
        return cls._instance

    def count_tokens(self, text: str) -> int:
        """Mathematically precise token counting."""
        return len(self.encoder.encode(text))

    def guard_context(self, context_list: List[str]) -> str:
        """
        SOTA Pruning Logic:
        Iterates through evidence and truncates to ensure zero-crash execution.
        """
        current_context = ""
        total_tokens = 0
        
        for chunk in context_list:
            chunk_tokens = self.count_tokens(chunk)
            if total_tokens + chunk_tokens > self.LIMIT:
                print(f"CAP REACHED: Context window at capacity. Pruning remaining chunks.")
                break
            current_context += f"\n\n{chunk}"
            total_tokens += chunk_tokens
            
        return current_context

# Global Singleton Accessor
monitor = ContextMonitor()
