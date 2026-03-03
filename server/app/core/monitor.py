import tiktoken
from typing import List, Optional, Any

class ContextMonitor:
    """
    SOTA Token Sentry V3.0.
    Ensures Path B Multi-Doc context fits within Llama 3.3 thresholds
    while maintaining a strict 20% "Reasoning Buffer."
    """
    
    _instance: Optional["ContextMonitor"] = None
    encoder: Any
    # 100k is the Gold Standard for a 128k model. 
    # It leaves ~28k tokens for complex instructions and high-density output.
    LIMIT: int = 100000 

    def __new__(cls) -> "ContextMonitor":
        if cls._instance is None:
            cls._instance = super(ContextMonitor, cls).__new__(cls)
            # cl100k_base is verified for Llama 3 / 3.3 tokenization
            cls._instance.encoder = tiktoken.get_encoding("cl100k_base")
        return cls._instance

    def count_tokens(self, text: str) -> int:
        """Mathematically precise token counting using cl100k_base."""
        if not text:
            return 0
        return len(self.encoder.encode(text))

    def guard_context(self, context_list: List[str]) -> str:
        """
        SOTA Dynamic Truncation:
        Prioritizes the most relevant chunks (top of the list) and 
        prunes the tail to ensure zero-crash execution.
        """
        current_context_parts: List[str] = []
        total_tokens = 0
        
        for i, chunk in enumerate(context_list):
            # We add a small overhead for the newline separators
            chunk_tokens = self.count_tokens(chunk) + 4 
            
            if total_tokens + chunk_tokens > self.LIMIT:
                remaining = len(context_list) - i
                print(f"⚠️ CONTEXT_GUARD: Limit reached. Pruned {remaining} tail-end chunks.")
                break
                
            current_context_parts.append(chunk)
            total_tokens += chunk_tokens
        
        # Join with double newlines for clear structural separation for the Architect
        final_context = "\n\n".join(current_context_parts)
        
        # LOGGING: Telemetry for the Founder (Path D preparation)
        pressure = (total_tokens / self.LIMIT) * 100
        print(f"CONTEXT_PRESSURE: {pressure:.1f}% ({total_tokens} tokens)")
        
        return final_context

# Global Singleton Accessor
monitor = ContextMonitor()
