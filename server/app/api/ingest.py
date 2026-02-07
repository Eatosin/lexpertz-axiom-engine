import os
import uuid
import shutil
import time
from typing import Optional, List, Any, Dict, cast
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel

# Internal Core Dependencies
from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user

# SOTA Document Digestion (IBM Docling)
from docling.document_converter import DocumentConverter # type: ignore

router = APIRouter()
TEMP_DIR = "/tmp/axiom_ingest"

# Initialize Docling once
converter = DocumentConverter()

# --- 1. THE BACKGROUND WORKER ---
def process_document(file_path: str, filename: str, user_id: str) -> None:
    try:
        print(f"AXIOM-CORE: Initiating structural analysis for {filename}")
        start_time = time.time()

        conv_result = converter.convert(file_path)
        markdown_content = conv_result.document.export_to_markdown()
        
        print(f"CONVERSION SUCCESS in {time.time() - start_time:.2f}s")

        document_id: Optional[int] = None
        if db:
            doc_res = db.table("documents").insert({
                "filename": filename,
                "user_id": user_id,
                "status": "processing"
            }).execute()
            
            data_list = cast(List[Dict[str, Any]], doc_res.data)
            if data_list and len(data_list) > 0:
                document_id = data_list[0].get('id')

        if document_id is None:
            raise RuntimeError("Cloud Vault registration failed.")

        chunks = chunker.split_text(markdown_content)
        data_payload: List[Dict[str, Any]] = []
        
        for i, chunk_text in enumerate(chunks):
            vector = get_embedding(chunk_text)
            data_payload.append({
                "document_id": document_id,
                "user_id": user_id,
                "content": chunk_text,
                "embedding": vector,
                "metadata": {"index": i, "source": filename, "engine": "docling-v2"}
            })

        if db:
            db.table("document_chunks").insert(cast(Any, data_payload)).execute()
            db.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()

        print(f"AUDIT-READY: {filename} synchronized.")

    except Exception as e:
        print(f"❌ PIPELINE FAILURE: {str(e)}")
        if db:
            db.table("documents").update({"status": "error"}).eq("filename", filename).execute()
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

# --- 2. ENDPOINT: UPLOAD ---
@router.post("/upload")
async def ingest_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF Required.")

    try:
        os.makedirs(TEMP_DIR, exist_ok=True)
        file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        background_tasks.add_task(process_document, file_path, file.filename, user_id)
        return {"status": "queued", "filename": file.filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- 3. ENDPOINT: STATUS BEACON ---
@router.get("/status/{filename}")
async def get_ingestion_status(filename: str, user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error", "message": "DB Offline"}
    res = db.table("documents").select("status").eq("filename", filename).eq("user_id", user_id).execute()
    status_data = cast(List[Dict[str, Any]], res.data)
    if not status_data: return {"status": "not_found"}
    return {"status": status_data[0].get('status', 'unknown')}

# --- 4. ENDPOINT: SESSION RECOVERY ---
@router.get("/latest")
async def get_latest_document(user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error"}
    res = db.table("documents").select("filename, status").eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    latest_data = cast(List[Dict[str, Any]], res.data)
    if not latest_data: return {"status": "none"}
    return {"status": "success", "filename": latest_data[0].get("filename"), "doc_status": latest_data[0].get("status")}

# --- 5. ENDPOINT: METADATA & STATS ---
@router.get("/metadata/{filename}")
async def get_document_metadata(filename: str, user_id: str = Depends(get_current_user)):
    if not db: return {"status": "error"}
    res = db.table("documents").select("*").eq("filename", filename).eq("user_id", user_id).order("created_at", desc=True).limit(1).execute()
    data_list = cast(List[Dict[str, Any]], res.data)
    if not data_list: return {"status": "not_found"}
    doc_data = data_list[0]
    
    # FIXED: Added cast(Any, "exact") to satisfy MyPy
    chunks = db.table("document_chunks").select("id", count=cast(Any, "exact")).eq("document_id", doc_data['id']).execute()
    
    return {
        "filename": filename,
        "status": doc_data.get('status'),
        "created_at": doc_data.get('created_at'),
        "chunk_count": chunks.count if chunks.count else 0,
        "is_permanent": doc_data.get('is_permanent', False)
    }

# --- 6. ENDPOINT: PERSISTENCE & DELETION ---
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
