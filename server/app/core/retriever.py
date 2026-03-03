from typing import List, Dict, Any, Optional, cast, Union
from app.core.database import db
from app.core.embeddings import get_embedding

async def hybrid_search(
    query: str, 
    user_id: str, 
    filename: Optional[Union[str, List[str]]] = None, # <--- MYPY FIX: Now officially supports lists
    limit: int = 20
) -> List[str]:
    """
    SOTA Retrieval Engine V3.1-PREMIUM.
    Upgraded for Multi-Document Synthesis (Path B).
    Injects 'Exhibit-ID' metadata envelopes to force granular citations
    and eliminate internal 'Evidence Block' leakage in the UI.
    """
    if not db: 
        return[]
        
    try:
        # 1. Generate the NVIDIA Embedding (1024-D)
        vector = get_embedding(query, input_type="query")
        
        # Determine if we are doing a global search
        is_vault_mode = not filename or filename == "vault" or filename == ["vault"]
        
        # 2. Case: GLOBAL VAULT SEARCH (Multi-file reasoning across all docs)
        if is_vault_mode:
            res = db.rpc("hybrid_vault_search", {
                "query_text": query,
                "query_embedding": vector,
                "match_count": limit,
                "target_user_id": user_id
            }).execute()
            
            rows = cast(List[Dict[str, Any]], res.data)
            
            # SOTA ENVELOPE: Dynamic filename extraction for cross-doc synthesis
            return[
                f"--- EXHIBIT_START_ID_{i+1} ---\n"
                f"FILE_SOURCE: {row['filename']}\n"
                f"DATA_CONTENT: {row['content']}\n"
                f"--- EXHIBIT_END_ID_{i+1} ---" 
                for i, row in enumerate(rows)
            ]

        # 3. Case: TARGETED SEARCH (Single or Multi-file Selection)
        # Uniformly treat as a list for robust .in_() operations
        target_files = [filename] if isinstance(filename, str) else filename
        
        doc_res = db.table("documents").select("id, filename").in_("filename", target_files).eq("user_id", user_id).execute()
        doc_data = cast(List[Dict[str, Any]], doc_res.data)

        if not doc_data:
            print(f"⚠️ RETRIEVER: Context {target_files} missing from vault.")
            return[]

        doc_ids = [d['id'] for d in doc_data]
        id_to_name = {d['id']: d['filename'] for d in doc_data}
        
        # Distribute the chunk limit across the selected documents
        limit_per_doc = max(1, limit // len(doc_ids))
        all_rows =[]

        # Loop through each selected document to grab its specific chunks
        for d_id in doc_ids:
            res = db.rpc("match_document_chunks", {
                "query_embedding": vector,
                "match_limit": limit_per_doc,
                "target_document_id": d_id,
                "target_user_id": user_id
            }).execute()
            
            # Tag each chunk with its exact filename to prevent Context Bleed
            for row in cast(List[Dict[str, Any]], res.data):
                row['filename'] = id_to_name[d_id]
                all_rows.append(row)

        # SOTA ENVELOPE: Injects Exhibit IDs and exact Filenames into the stream
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
