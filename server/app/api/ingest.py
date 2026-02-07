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

# Initialize Docling once to keep memory warm
converter = DocumentConverter()

# --- 1. THE BACKGROUND WORKER ---
def process_document(file_path: str, filename: str, user_id: str) -> None:
    """
    Standard 'def' ensures multi-threaded execution on shared CPU.
    """
    try:
        print(f"AXIOM-CORE: Initiating structural analysis for {filename}")
        start_time = time.time()

        # Structural Extraction
        conv_result = converter.convert(file_path)
        markdown_content = conv_result.document.export_to_markdown()
        
        print(f"CONVERSION SUCCESS in {time.time() - start_time:.2f}s")

        # Vault Registration
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
            raise RuntimeError("Cloud Vault registration failed.")

        # Fragmentation & Vectorization
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

        # Batch Commit
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
async def get_ingestion_status(
    filename: str, 
    user_id: str = Depends(get_current_user)
):
    if not db:
        return {"status": "error", "message": "DB Offline"}

    res = db.table("documents").select("status").eq("filename", filename).eq("user_id", user_id).execute()
    data = cast(List[Dict[str, Any]], res.data)
    
    if not data:
        return {"status": "not_found"}
    return {"status": data[0].get('status', 'unknown')}

# --- 4. ENDPOINT: SESSION RECOVERY ---
@router.get("/latest")
async def get_latest_document(user_id: str = Depends(get_current_user)):
    """
    SOTA Logic: Recovers the last processed document to hydrate the UI.
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

# sync metadata in document panel
@router.get("/metadata/{filename}")
async def get_document_metadata(filename: str, user_id: str = Depends(get_current_user)):
    """
    Returns live stats for the Document Panel.
    """
    if not db: return {"status": "error"}

    # Get doc info
    doc = db.table("documents").select("*").eq("filename", filename).eq("user_id", user_id).single().execute()
    
    # Get chunk count
    chunks = db.table("document_chunks").select("id", count="exact").eq("document_id", doc.data['id']).execute()
    
    return {
        "filename": filename,
        "status": doc.data['status'],
        "created_at": doc.data['created_at'],
        "chunk_count": chunks.count,
        "is_permanent": doc.data.get('is_permanent', False)
    }

# --- 5. ENDPOINT: PERSISTENCE (SAVE) ---
class SaveRequest(BaseModel):
    filename: str

@router.post("/save")
async def save_document_to_vault(req: SaveRequest, user_id: str = Depends(get_current_user)):
    """
    Sets the 'is_permanent' flag so the document is never cleaned up.
    """
    if db:
        db.table("documents").update({"is_permanent": True}).eq("filename", req.filename).eq("user_id", user_id).execute()
        return {"status": "persisted"}
    return {"status": "error"}
