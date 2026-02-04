from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
import shutil
import os
import uuid
from typing import Optional, List, Any, cast
from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user # <--- IMPORTED

# Note: The following library is excluded from standard CI builds due to size
from unstructured.partition.pdf import partition_pdf # type: ignore 

router = APIRouter()
TEMP_DIR = "/tmp/axiom_ingest"

def process_document(file_path: str, filename: str, user_id: str) -> None:
    try:
        elements = partition_pdf(filename=file_path, strategy="fast")
        full_text = "\n".join([str(el) for el in elements])

        document_id: Optional[int] = None
        
        if db:
            doc_res = db.table("documents").insert({
                "filename": filename,
                "user_id": user_id, # REAL USER ID
                "status": "processing"
            }).execute()
            
            data = cast(List[dict[str, Any]], doc_res.data)
            if data and len(data) > 0:
                document_id = data[0].get('id')

        if document_id is None:
            raise RuntimeError("Cloud Vault registration failed.")

        chunks = chunker.split_text(full_text)
        data_payload: List[Any] = []
        
        for i, chunk_text in enumerate(chunks):
            vector = get_embedding(chunk_text)
            data_payload.append({
                "document_id": document_id,
                "user_id": user_id, # REAL USER ID
                "content": chunk_text,
                "embedding": vector,
                "metadata": {"index": i, "source": filename}
            })

        if db:
            db.table("document_chunks").insert(cast(Any, data_payload)).execute()
            db.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()

    except Exception as e:
        print(f"❌ Critical Pipeline Failure: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/upload")
async def ingest_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user) # <--- DYNAMIC IDENTITY INJECTED
):
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Protocol Violation: PDF Required.")

    os.makedirs(TEMP_DIR, exist_ok=True)
    file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Pass the real user_id to the background worker
    background_tasks.add_task(process_document, file_path, file.filename, user_id)
    
    return {"status": "queued", "filename": file.filename, "vault": "axiom_beta_v1"}
# --- Status Beacon (New Addition for Phase 11) ---
@router.get("/status/{filename}")
async def get_ingestion_status(
    filename: str, 
    user_id: str = Depends(get_current_user)
):
    """
    Polled by Frontend to check if vectorization is complete.
    """
    if not db:
        return {"status": "error", "message": "DB Offline"}

    # RLS Enforcement: We also query by user_id to prevent enumeration attacks
    res = db.table("documents").select("status").eq("filename", filename).eq("user_id", user_id).execute()
    
    # Cast response to list of dicts to satisfy MyPy
    data = cast(List[dict[str, Any]], res.data)
    
    if not data:
        return {"status": "not_found"}
        
    return {"status": data[0].get('status', 'unknown')}
