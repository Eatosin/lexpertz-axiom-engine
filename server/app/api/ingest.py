import os
import uuid
import shutil
import time
from typing import Optional, List, Any, Dict, cast
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends

# Internal Core Dependencies
from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user

# SOTA Document Digestion (IBM Docling)
from docling.document_converter import DocumentConverter # type: ignore

router = APIRouter()
TEMP_DIR = "/tmp/axiom_ingest"

# --- Singleton Initialization ---
# We initialize once to keep the ONNX models warm in memory
converter = DocumentConverter()

def process_document(file_path: str, filename: str, user_id: str) -> None:
    """
    Axiom Processing Pipeline:
    Converts raw PDF to Structured Markdown -> Semantic Chunks -> Evidence Vault.
    """
    try:
        print(f"🧬 AXIOM-CORE: Initiating structural analysis for {filename}")
        start_time = time.time()

        # 1. Structural Extraction (IBM Docling)
        # Handles OCR and complex layout analysis natively
        conv_result = converter.convert(file_path)
        
        # 2. Export to Structured Markdown
        # This is 10x more accurate for RAG than raw text
        markdown_content = conv_result.document.export_to_markdown()
        
        processing_duration = time.time() - start_time
        print(f"CONVERSION SUCCESS: {filename} parsed in {processing_duration:.2f}s")

        # 3. Vault Registration
        document_id: Optional[int] = None
        if db:
            doc_res = db.table("documents").insert({
                "filename": filename,
                "user_id": user_id,
                "status": "processing"
            }).execute()
            
            data = cast(List[Dict[str, Any]], doc_res.data)
            if data and len(data) > 0:
                document_id = data[0].get('id')

        if document_id is None:
            raise RuntimeError("Database Handshake Failure: Could not register document.")

        # 4. Semantic Fragmentation (Chunking)
        chunks = chunker.split_text(markdown_content)
        print(f"FRAGMENTATION: Generated {len(chunks)} evidence segments.")

        # 5. Vectorization & Evidence Mapping
        data_payload: List[Dict[str, Any]] = []
        for i, chunk_text in enumerate(chunks):
            # Generate 768-dim vector via Local BGE Model
            vector = get_embedding(chunk_text)
            
            data_payload.append({
                "document_id": document_id,
                "user_id": user_id,
                "content": chunk_text,
                "embedding": vector,
                "metadata": {
                    "index": i, 
                    "source": filename, 
                    "engine": "docling-v2-markdown"
                }
            })

        # 6. Atomic Commit to Evidence Vault
        if db:
            # Cast payload to Any to satisfy Supabase's strict request builder
            db.table("document_chunks").insert(cast(Any, data_payload)).execute()
            
            # Finalize Status
            db.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()

        print(f"AUDIT-READY: {filename} has been synchronized with the Vault.")

    except Exception as e:
        print(f"❌ CRITICAL PIPELINE FAILURE for {filename}: {str(e)}")
        if db:
            # Telemetry: Mark document as failed in the DB to alert the UI
            db.table("documents").update({"status": "error"}).eq("filename", filename).execute()
    finally:
        # Secure cleanup of binary artifacts
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/upload")
async def ingest_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """
    Secure Entry Port for Evidence Ingestion.
    """
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Protocol Violation: PDF Document Required.")

    try:
        os.makedirs(TEMP_DIR, exist_ok=True)
        unique_id = uuid.uuid4()
        file_path = f"{TEMP_DIR}/{unique_id}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Hand over to threaded background worker
        background_tasks.add_task(process_document, file_path, file.filename, user_id)
        
        return {
            "status": "queued",
            "filename": file.filename,
            "handshake": "established",
            "vault": "axiom_production_v1"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion Protocol Failed: {str(e)}")

@router.get("/status/{filename}")
async def get_ingestion_status(
    filename: str, 
    user_id: str = Depends(get_current_user)
):
    """
    Status Beacon: Polled by Dashboard to monitor processing progress.
    """
    if not db:
        return {"status": "error", "message": "Vault DB Offline"}

    # Verified query using RLS principles
    res = db.table("documents").select("status").eq("filename", filename).eq("user_id", user_id).execute()
    
    data = cast(List[Dict[str, Any]], res.data)
    
    if not data:
        return {"status": "not_found"}
        
    return {"status": data[0].get('status', 'unknown')}
    
    @router.get("/latest")
async def get_latest_document(user_id: str = Depends(get_current_user)):
    """
    Retrieves the most recent document for the authenticated user.
    Used to 'Hydrate' the UI after a page refresh.
    """
    if not db:
        return {"status": "error"}

    res = db.table("documents") \
            .select("filename, status") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()
    
    data = cast(List[Dict[str, Any]], res.data)
    
    if not data:
        return {"status": "none"}
        
    return {
        "status": "success",
        "filename": data[0].get("filename"),
        "doc_status": data[0].get("status")
    }
