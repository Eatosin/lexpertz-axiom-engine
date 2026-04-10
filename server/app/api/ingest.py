import os
import uuid
import math
import asyncio
from typing import Optional, List, Any, Dict, cast
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends, Path
from pydantic import BaseModel

from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user

# Lazy Initialization for Docling
_converter = None

def get_converter():
    global _converter
    if _converter is None:
        print("AXIOM-CORE: Waking up Docling V2 Intelligence...")
        from docling.document_converter import DocumentConverter # type: ignore
        _converter = DocumentConverter()
    return _converter

router = APIRouter()
TEMP_DIR = "/tmp/axiom_ingest"

# --- HELPER: CONCURRENT VECTORIZATION ---
async def fetch_embedding_concurrently(chunk_text: str, semaphore: asyncio.Semaphore) -> List[float]:
    """Bounds concurrent requests to NVIDIA to prevent 429 Rate Limits."""
    async with semaphore:
        return await asyncio.to_thread(get_embedding, chunk_text, input_type="document")

# --- THE SOTA BACKGROUND ENGINE ---
async def process_document(file_path: str, filename: str, user_id: str) -> None:
    try:
        print(f"AXIOM-CORE: Parsing {filename} (Async Mode)")
        
        # 1. CPU-Bound Task Offloading (Prevents GIL Freeze)
        converter = get_converter()
        conv_result = await asyncio.to_thread(converter.convert, file_path)
        markdown_content = conv_result.document.export_to_markdown()

        # 2. Register Document (Non-blocking DB)
        document_id: Optional[int] = None
        if db:
            doc_res = await asyncio.to_thread(
                lambda: db.table("documents").insert({
                    "filename": filename, "user_id": user_id, "status": "processing", "is_permanent": False 
                }).execute()
            )
            data = cast(List[Dict[str, Any]], doc_res.data)
            if data: document_id = data[0].get('id')

        if not document_id: raise RuntimeError("DB Insert Failed")

        # 3. Chunking
        chunks = await chunker.split_text(markdown_content)
        print(f"AXIOM-CORE: Vectorizing {len(chunks)} chunks concurrently...")

        # 4. SOTA: Concurrent Batch Vectorization (Massive Speedup)
        # Limit to 15 parallel connections to respect NVIDIA NIM rate limits
        semaphore = asyncio.Semaphore(15) 
        tasks =[fetch_embedding_concurrently(chunk, semaphore) for chunk in chunks]
        vectors = await asyncio.gather(*tasks)

        # 5. Assemble Payload
        data_payload: List[Dict[str, Any]] =[]
        for i, (chunk_text, vector) in enumerate(zip(chunks, vectors)):
            data_payload.append({
                "document_id": document_id, "user_id": user_id, "content": chunk_text,
                "embedding": vector, "metadata": {"index": i, "source": filename, "engine": "docling-v2-nim"}
            })

        # 6. Non-Blocking Batch DB Insertion
        if db:
            # Strictly typed helper function to satisfy Mypy
            def insert_batch(batch_data: List[Dict[str, Any]]) -> None:
                db.table("document_chunks").insert(cast(Any, batch_data)).execute()

            BATCH_SIZE = 50
            for j in range(0, len(data_payload), BATCH_SIZE):
                batch = data_payload[j : j + BATCH_SIZE]
                # Pass the function and its arguments natively to to_thread
                await asyncio.to_thread(insert_batch, batch)
            
            # Helper for the status update to avoid another lambda
            def update_status() -> None:
                db.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()
                
            await asyncio.to_thread(update_status)

        print(f"COMPLETE: {filename} indexed successfully.")
        
    except Exception as e:
        print(f"❌ INGESTION FAILED: {str(e)}")
        if db: 
            await asyncio.to_thread(
                lambda: db.table("documents").update({"status": "error"}).eq("filename", filename).execute()
            )
    finally:
        if os.path.exists(file_path): os.remove(file_path)

# --- ROUTES ---

@router.post("/upload")
async def ingest_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """File Upload Handler with Path Traversal Protection"""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Protocol Violation: PDF Document Required.")

    try:
        os.makedirs(TEMP_DIR, exist_ok=True)
        # Prevent Directory Traversal by stripping paths
        safe_filename = os.path.basename(file.filename)
        file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{safe_filename}"
        
        # Async file read/write
        content = await file.read()
        await asyncio.to_thread(lambda: open(file_path, "wb").write(content))
        
        # FastAPI Native Async Background Task
        background_tasks.add_task(process_document, file_path, safe_filename, user_id)
        
        return {"status": "queued", "filename": safe_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{filename}")
async def get_ingestion_status(filename: str = Path(...), user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error", "message": "DB Offline"}
    res = await asyncio.to_thread(
        lambda: db.table("documents").select("status").eq("filename", filename).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    )
    data = cast(List[Dict[str, Any]], res.data)
    return {"status": data[0].get('status', 'unknown')} if data else {"status": "not_found"}

@router.get("/latest")
async def get_latest_document(user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error"}
    res = await asyncio.to_thread(
        lambda: db.table("documents").select("filename, status").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    )
    data = cast(List[Dict[str, Any]], res.data)
    return {"status": "success", "filename": data[0].get("filename"), "doc_status": data[0].get("status")} if data else {"status": "none"}

@router.get("/metadata/{filename}")
async def get_document_metadata(filename: str = Path(...), user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error"}
    res = await asyncio.to_thread(
        lambda: db.table("documents").select("*").eq("filename", filename).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    )
    data_list = cast(List[Dict[str, Any]], res.data)
    if not data_list: return {"status": "not_found"}
    doc_data = data_list[0]
    
    chunks = await asyncio.to_thread(
        lambda: db.table("document_chunks").select("id", count=cast(Any, "exact")).eq("document_id", doc_data['id']).execute()
    )
    return {
        "filename": filename,
        "status": doc_data.get('status'),
        "created_at": doc_data.get('created_at'),
        "chunk_count": chunks.count if chunks.count else 0,
        "is_permanent": doc_data.get('is_permanent', False)
    }

class SaveRequest(BaseModel):
    filename: str

@router.post("/save")
async def save_document_to_vault(req: SaveRequest, user_id: str = Depends(get_current_user)):
    if db:
        await asyncio.to_thread(
            lambda: db.table("documents").update({"is_permanent": True}).eq("filename", req.filename).eq("user_id", user_id).execute()
        )
        return {"status": "persisted"}
    return {"status": "error"}

@router.delete("/documents/{filename}")
async def delete_document(filename: str = Path(...), user_id: str = Depends(get_current_user)):
    if not db: raise HTTPException(status_code=500, detail="Vault DB Offline")
    await asyncio.to_thread(
        lambda: db.table("documents").delete().eq("filename", filename).eq("user_id", user_id).execute()
    )
    return {"status": "purged", "filename": filename}

def sanitize_float(val: Any) -> float:
    try:
        f_val = float(val)
        return f_val if math.isfinite(f_val) else 0.0
    except (TypeError, ValueError):
        return 0.0

@router.get("/telemetry")
async def get_system_telemetry(user_id: str = Depends(get_current_user)):
    """Async offloaded telemetry aggregation."""
    if not db: return {"chunks": "--", "persistence": "--", "blocked": "--", "latency": "--"}
    
    try:
        docs_res = await asyncio.to_thread(lambda: db.table("documents").select("id, is_permanent").eq("user_id", user_id).execute())
        docs = cast(List[Dict[str, Any]], docs_res.data)
        
        total_docs = len(docs)
        persisted_docs = sum(1 for d in docs if d.get("is_permanent", False))
        persistence_rate = f"{int((persisted_docs / total_docs) * 100)}%" if total_docs > 0 else "0%"
        
        chunks_res = await asyncio.to_thread(lambda: db.table("document_chunks").select("id", count=cast(Any, "exact")).eq("user_id", user_id).execute())
        total_chunks = chunks_res.count if chunks_res.count else 0
        
        logs_res = await asyncio.to_thread(lambda: db.table("audit_logs").select("faithfulness, precision, relevance, latency").eq("user_id", user_id).order("created_at", desc=True).limit(50).execute())
        logs = cast(List[Dict[str, Any]], logs_res.data)
        
        avg_faith, avg_prec, avg_rel, avg_latency, blocked = 0.0, 0.0, 0.0, 0.0, 0
        
        if logs:
            total_logs = len(logs)
            avg_faith = sum(sanitize_float(l.get("faithfulness", 0.0)) for l in logs) / total_logs
            avg_prec = sum(sanitize_float(l.get("precision", 0.0)) for l in logs) / total_logs
            avg_rel = sum(sanitize_float(l.get("relevance", 0.0)) for l in logs) / total_logs
            blocked = sum(1 for l in logs if sanitize_float(l.get("faithfulness", 0.0)) < 0.8)
            
            valid_latencies =[sanitize_float(l.get("latency", 0.0)) for l in logs if sanitize_float(l.get("latency", 0.0)) > 0]
            if valid_latencies:
                avg_latency = sum(valid_latencies) / len(valid_latencies)
            
        return {
            "chunks": str(total_chunks),
            "persistence": persistence_rate,
            "blocked": str(blocked),
            "latency": f"{sanitize_float(avg_latency):.1f}s",
            "ragas": {"faithfulness": sanitize_float(avg_faith), "precision": sanitize_float(avg_prec), "relevance": sanitize_float(avg_rel)}
        }
    except Exception as e:
        print(f"❌ TELEMETRY ERROR: {e}")
        return {"chunks": "--", "persistence": "--", "blocked": "--", "latency": "--"}
