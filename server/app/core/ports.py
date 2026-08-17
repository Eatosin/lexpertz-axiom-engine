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

    # ------------------------------------------------------------------
    # API-layer operations (SiaS sidecar endpoints)
    # ------------------------------------------------------------------

    async def list_documents(self, limit: Optional[int] = 100) -> List[Dict[str, Any]]:
        """Return the most recent ``limit`` documents (newest first)."""

    async def get_document_by_filename(self, filename: str) -> Optional[Dict[str, Any]]:
        """Return the most recent document record for ``filename`` or ``None``."""

    async def update_document_status(self, document_id: int, status: str) -> bool:
        """Set a document's status. Returns True if a row was updated."""

    async def set_document_permanent(self, filename: str) -> bool:
        """Mark a document (by filename) permanent. Returns True on success."""

    async def delete_document(self, filename: str) -> bool:
        """Delete a document, its chunks (vector + keyword indexes), and its
        chat history. Returns True if anything was deleted."""

    async def search_vault(
        self,
        query_embedding: List[float],
        query_text: str,
        limit: int = 5,
    ) -> List[Dict[str, Any]]:
        """Hybrid retrieval: vector KNN merged with keyword (FTS) matches.

        Each result carries ``id``, ``filename``, ``content``,
        ``similarity``, and ``fts_rank``.
        """

    async def store_audit_log(
        self,
        question: str,
        metrics: Optional[Dict[str, Any]] = None,
        latency: float = 0.0,
    ) -> int:
        """Persist one audit evaluation row; returns its id."""

    async def list_audit_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Return the most recent ``limit`` audit logs (newest first)."""

    async def create_api_key(self, name: str, key_hash: str, key_hint: str) -> int:
        """Register an API key (hash only, never the raw key)."""

    async def list_api_keys(self) -> List[Dict[str, Any]]:
        """Return API key records (id, name, hint, active, created_at)."""

    async def revoke_api_key(self, key_id: str) -> bool:
        """Deactivate an API key. Returns True if a key was revoked."""


@runtime_checkable
class EmbeddingPort(Protocol):
    """Embedding seam. Local (MiniLM/ONNX) and cloud (NVIDIA NIM) adapters."""

    async def embed_text(self, text: str, is_query: bool = False) -> List[float]:
        """Embed ``text`` into a dense vector. ``is_query`` hints that the
        text is a short retrieval query (may select query-optimized weights)."""

    @property
    def dimension(self) -> int:
        """Dimensionality of the produced vectors (384 local / 1024 cloud)."""
