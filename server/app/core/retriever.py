import asyncio
from typing import List, Dict, Any, Optional, Union
from app.core.adapters import get_vault
from app.core.embeddings import get_embedding


async def hybrid_search(
    query: str,
    user_id: str,
    filename: Optional[Union[str, List[str]]] = None,
    limit: int = 20,
) -> List[str]:
    """
    Retrieval engine: hybrid (vector + keyword) vault search.
    Injects 'Exhibit-ID' metadata envelopes to force granular citations.
    """
    try:
        vault = get_vault()

        # 1. Non-blocking embedding generation (thread pool)
        vector = await asyncio.to_thread(get_embedding, query, "query")

        is_vault_mode = not filename or filename == "vault" or filename == ["vault"]

        # =========================================================
        # PATH A: GLOBAL VAULT SEARCH (Multi-file hybrid search)
        # =========================================================
        if is_vault_mode:
            rows = await vault.search_vault(
                query_embedding=vector, query_text=query, limit=limit
            )
            return [
                f"--- EXHIBIT_START_ID_{i+1} ---\n"
                f"FILE_SOURCE: {row['filename']}\n"
                f"DATA_CONTENT: {row['content']}\n"
                f"--- EXHIBIT_END_ID_{i+1} ---"
                for i, row in enumerate(rows)
            ]

        # =========================================================
        # PATH B: TARGETED DOCUMENT SEARCH (Multi-doc synthesis)
        # =========================================================
        target_files: List[str] = []
        if isinstance(filename, str):
            target_files = [filename]
        elif isinstance(filename, list):
            target_files = filename

        doc_ids: List[int] = []
        id_to_name: Dict[int, str] = {}
        for fname in target_files:
            doc = await vault.get_document_by_filename(fname)
            if doc:
                doc_ids.append(doc["id"])
                id_to_name[doc["id"]] = doc["filename"]

        if not doc_ids:
            print(f"RETRIEVER: Context {target_files} missing from vault.")
            return []

        limit_per_doc = max(1, limit // len(doc_ids))

        async def fetch_chunks(d_id: int) -> List[Dict[str, Any]]:
            chunks = await vault.search_similar(vector, limit=limit_per_doc)
            # search_similar is vault-wide; keep only the target document's chunks.
            doc_chunks = [c for c in chunks if c["document_id"] == d_id]
            for r in doc_chunks:
                r["filename"] = id_to_name[d_id]
            return doc_chunks

        results_nested = await asyncio.gather(*(fetch_chunks(d_id) for d_id in doc_ids))
        all_rows = [row for sublist in results_nested for row in sublist]

        return [
            f"--- EXHIBIT_START_ID_{i+1} ---\n"
            f"FILE_SOURCE: {row['filename']}\n"
            f"DATA_CONTENT: {row['content']}\n"
            f"--- EXHIBIT_END_ID_{i+1} ---"
            for i, row in enumerate(all_rows)
        ]

    except Exception as e:
        print(f"RETRIEVER CRITICAL ERROR: {e}")
        return []
