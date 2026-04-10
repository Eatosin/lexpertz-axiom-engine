import tiktoken
from typing import List, Optional

class ContextMonitor:
    """SOTA Token Sentry V4.6. Enterprise-grade context truncation."""
    _instance: Optional["ContextMonitor"] = None
    encoder: Optional[tiktoken.Encoding] = None
    LIMIT: int = 100000 

    def __new__(cls) -> "ContextMonitor":
        if cls._instance is None:
            cls._instance = super(ContextMonitor, cls).__new__(cls)
        return cls._instance

    def _lazy_init(self) -> None:
        if self.encoder is None:
            print("AXIOM-CORE: Materializing Token Sentry...")
            self.encoder = tiktoken.get_encoding("cl100k_base")

    def count_tokens(self, text: str) -> int:
        if not text: return 0
        self._lazy_init()
        return len(self.encoder.encode(text)) # type: ignore

    def guard_context(self, context_list: List[str]) -> str:
        self._lazy_init()
        current_parts: List[str] = []
        total_tokens = 0
        
        for chunk in context_list:
            tokens = self.count_tokens(chunk) + 4 
            if total_tokens + tokens > self.LIMIT:
                break
            current_parts.append(chunk)
            total_tokens += tokens
        
        pressure = (total_tokens / self.LIMIT) * 100
        print(f"CONTEXT_PRESSURE: {pressure:.1f}% ({total_tokens} tokens)")
        return "\n\n".join(current_parts)

monitor = ContextMonitor()
