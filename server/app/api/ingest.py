import os
import uuid
import shutil
import time
from typing import Optional, List, Any, Dict, cast
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel

from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user
from docling.document_converter import DocumentConverter # type: ignore

router = APIRouter()
TEMP_DIR = "/tmp/axiom_ingest"

# Singleton
converter = DocumentConverter()

def process_document(file_path: str, filename: str, user_id: str) -> None:
    try:
        print(f"AXIOM-CORE: Parsing {filename}")
        
        # 1. Docling Parse
        conv_result = converter.convert(file_path)
        markdown_content = conv_result.document.export_to_markdown()

        # 2. Register Doc
        document_id: Optional[int] = None
        if db:
            doc_res = db.table("documents").insert({
                "filename": filename,
                "user_id": user_id,
                "status": "processing"
            }).execute()
            data = cast(List[Dict[str, Any]], doc_res.data)
            if data: document_id = data[0].get('id')

        if not document_id: raise RuntimeError("DB Insert Failed")

        # 3. Chunk
        chunks = chunker.split_text(markdown_content)
        data_payload: List[Dict[str, Any]] = []

        print(f"Vectorizing {len(chunks)} chunks...")

        # 4. Embed (Batch prep)
        for i, chunk_text in enumerate(chunks):
            # SOTA: Input Type 'document' for NVIDIA VL model
            vector = get_embedding(chunk_text, input_type="document")
            
            data_payload.append({
                "document_id": document_id,
                "user_id": user_id,
                "content": chunk_text,
                "embedding": vector,
                "metadata": {"index": i, "source": filename, "engine": "docling-v2-nim"}
            })

        # 5. Batch Insert (50 at a time)
        if db:
            BATCH_SIZE = 50
            for j in range(0, len(data_payload), BATCH_SIZE):
                batch = data_payload[j : j + BATCH_SIZE]
                db.table("document_chunks").insert(cast(Any, batch)).execute()
            
            db.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()

        print(f"COMPLETE: {filename} indexed.")

    except Exception as e:
        print(f"❌ FAILED: {e}")
        if db: db.table("documents").update({"status": "error"}).eq("filename", filename).execute()
    finally:
        if os.path.exists(file_path): os.remove(file_path)

@router.post("/upload")
async def ingest_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    # FIX: Explicitly check if filename exists to satisfy MyPy
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Protocol Violation: PDF Document Required.")

    try:
        os.makedirs(TEMP_DIR, exist_ok=True)
        file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Now MyPy knows file.filename is a string
        background_tasks.add_task(process_document, file_path, file.filename, user_id)
        
        return {"status": "queued", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{filename}")
async def get_ingestion_status(filename: str, user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error", "message": "DB Offline"}
    res = db.table("documents").select("status").eq("filename", filename).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    data = cast(List[Dict[str, Any]], res.data)
    return {"status": data[0].get('status', 'unknown')} if data else {"status": "not_found"}

@router.get("/latest")
async def get_latest_document(user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error"}
    res = db.table("documents").select("filename, status").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    data = cast(List[Dict[str, Any]], res.data)
    return {"status": "success", "filename": data[0].get("filename"), "doc_status": data[0].get("status")} if data else {"status": "none"}

@router.get("/metadata/{filename}")
async def get_document_metadata(filename: str, user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error"}
    res = db.table("documents").select("*").eq("filename", filename).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    data_list = cast(List[Dict[str, Any]], res.data)
    if not data_list: return {"status": "not_found"}
    doc_data = data_list[0]
    
    chunks = db.table("document_chunks").select("id", count=cast(Any, "exact")).eq("document_id", doc_data['id']).execute()
    
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
        db.table("documents").update({"is_permanent": True}).eq("filename", req.filename).eq("user_id", user_id).execute()
        return {"status": "persisted"}
    return {"status": "error"}

@router.delete("/documents/{filename}")
async def delete_document(filename: str, user_id: str = Depends(get_current_user)):
    if not db: raise HTTPException(status_code=500, detail="Vault DB Offline")
    db.table("documents").delete().eq("filename", filename).eq("user_id", user_id).execute()
    return {"status": "purged", "filename": filename}
