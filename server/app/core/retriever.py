import asyncio
from typing import List, Dict, Any, Optional, cast, Union
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(
    query: str, 
    user_id: str, 
    filename: Optional[Union[str, List[str]]] = None,
    limit: int = 20
) -> List[str]:
    """
    SOTA Retrieval Engine V4.6.
    Fully Asynchronous. Concurrent Multi-Doc Fetching.
    Injects 'Exhibit-ID' metadata envelopes to force granular citations.
    """
    if not db: 
        return[]
        
    try:
        # 1. Non-Blocking NVIDIA Embedding Generation
        vector = await asyncio.to_thread(get_embedding, query, "query")
        
        is_vault_mode = not filename or filename == "vault" or filename ==["vault"]
        
        # =========================================================
        # PATH A: GLOBAL VAULT SEARCH (Multi-file hybrid search)
        # =========================================================
        if is_vault_mode:
            def run_vault_rpc() -> Any:
                return db.rpc("hybrid_vault_search", {
                    "query_text": query,
                    "query_embedding": vector,
                    "match_count": limit,
                    "target_user_id": user_id
                }).execute()
                
            # Non-blocking RPC Call
            res = await asyncio.to_thread(run_vault_rpc)
            rows = cast(List[Dict[str, Any]], res.data)
            
            return[
                f"--- EXHIBIT_START_ID_{i+1} ---\n"
                f"FILE_SOURCE: {row['filename']}\n"
                f"DATA_CONTENT: {row['content']}\n"
                f"--- EXHIBIT_END_ID_{i+1} ---" 
                for i, row in enumerate(rows)
            ]

        # =========================================================
        # PATH B: TARGETED DOCUMENT SEARCH (Multi-doc Synthesis)
        # =========================================================
        target_files: List[str] =[]
        if isinstance(filename, str):
            target_files = [filename]
        elif isinstance(filename, list):
            target_files = filename
        
        def fetch_docs() -> Any:
            return db.table("documents").select("id, filename").in_("filename", target_files).eq("user_id", user_id).execute()
            
        doc_res = await asyncio.to_thread(fetch_docs)
        doc_data = cast(List[Dict[str, Any]], doc_res.data)

        if not doc_data:
            print(f"RETRIEVER: Context {target_files} missing from vault.")
            return []

        doc_ids = [d['id'] for d in doc_data]
        id_to_name = {d['id']: d['filename'] for d in doc_data}
        limit_per_doc = max(1, limit // len(doc_ids))
        
        # SOTA OPTIMIZATION: Concurrent RPC execution
        # Instead of querying documents sequentially, we query them simultaneously!
        async def fetch_chunks(d_id: int) -> List[Dict[str, Any]]:
            def run_chunk_rpc() -> Any:
                return db.rpc("match_document_chunks", {
                    "query_embedding": vector,
                    "match_limit": limit_per_doc,
                    "target_document_id": d_id,
                    "target_user_id": user_id
                }).execute()
            
            chunk_res = await asyncio.to_thread(run_chunk_rpc)
            chunk_rows = cast(List[Dict[str, Any]], chunk_res.data)
            
            # Tag each chunk with its exact filename
            for r in chunk_rows:
                r['filename'] = id_to_name[d_id]
            return chunk_rows

        # 3. Fire all document queries to Supabase AT THE SAME TIME
        tasks =[fetch_chunks(d_id) for d_id in doc_ids]
        results_nested = await asyncio.gather(*tasks)
        
        # Flatten the nested results array
        all_rows = [row for sublist in results_nested for row in sublist]

        # SOTA ENVELOPE INJECTION
        return[
            f"--- EXHIBIT_START_ID_{i+1} ---\n"
            f"FILE_SOURCE: {row['filename']}\n"
            f"DATA_CONTENT: {row['content']}\n"
            f"--- EXHIBIT_END_ID_{i+1} ---" 
            for i, row in enumerate(all_rows)
        ]

    except Exception as e:
        print(f"❌ RETRIEVER CRITICAL ERROR: {e}")
        return[]
