"""Port contracts for the SiaS sidecar (Phase 0).

These ``Protocol`` interfaces define the seams between the API layer and the
storage/embedding backends. Any adapter (Supabase, SQLite, in-memory fake)
can be swapped behind them without breaking consumers.

Documented contract per method: input types, return types, error semantics.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional, Protocol, runtime_checkable


@runtime_checkable
class VaultPort(Protocol):
    """Storage seam for vaults, documents, chunks, chat history, telemetry.

    Error semantics: implementors MUST raise on unrecoverable failures
    (connection loss, corrupt data). ``get_document`` returns ``None`` for a
    missing id — that is not an error.
    """

    async def store_document(self, filename: str, status: str = "processing") -> int:
        """Register a document and return its id. ``status`` defaults to
        ``processing`` so the UI can render an in-progress state."""

    async def get_document(self, document_id: int) -> Optional[Dict[str, Any]]:
        """Return the document record or ``None`` if it does not exist."""

    async def search_similar(
        self, embedding: List[float], limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Return up to ``limit`` chunks ranked by similarity to ``embedding``."""

    async def store_chunk(
        self, document_id: int, content: str, embedding: List[float], index: int
    ) -> int:
        """Persist one chunk and return its storage id."""

    async def store_message(
        self,
        document_id: int,
        role: str,
        content: str,
        metrics: Optional[Dict[str, Any]] = None,
    ) -> int:
        """Persist one chat message and return its storage id."""

    async def get_history(
        self, document_id: int, limit: int = 5
    ) -> List[Dict[str, str]]:
        """Return the most recent ``limit`` messages for a document, oldest-first."""

    async def get_telemetry(self) -> Dict[str, Any]:
        """Return aggregate counters (documents, chunks, messages, ...)."""

    async def create_vault(self, slug: str) -> bool:
        """Create a vault for ``slug``. Returns True on success."""

    async def list_vaults(self) -> List[str]:
        """Return the slugs of all existing vaults."""

    async def delete_vault(self, slug: str) -> bool:
        """Delete a vault and its contents. Returns True on success."""


@runtime_checkable
class EmbeddingPort(Protocol):
    """Embedding seam. Local (MiniLM/ONNX) and cloud (NVIDIA NIM) adapters."""

    async def embed_text(self, text: str, is_query: bool = False) -> List[float]:
        """Embed ``text`` into a dense vector. ``is_query`` hints that the
        text is a short retrieval query (may select query-optimized weights)."""

    @property
    def dimension(self) -> int:
        """Dimensionality of the produced vectors (384 local / 1024 cloud)."""
