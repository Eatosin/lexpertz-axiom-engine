import os
import uuid
import shutil
import math
from typing import Optional, List, Any, Dict, cast
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel

from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user

# Lazy Initialization: Do NOT import/init DocumentConverter here.
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

def process_document(file_path: str, filename: str, user_id: str) -> None:
    try:
        print(f"AXIOM-CORE: Parsing {filename}")
        
        # 1. Lazy Docling Parse
        converter = get_converter()
        conv_result = converter.convert(file_path)
        markdown_content = conv_result.document.export_to_markdown()

        # 2. Register Doc
        document_id: Optional[int] = None
        if db:
            doc_res = db.table("documents").insert({
                "filename": filename,
                "user_id": user_id,
                "status": "processing",
                "is_permanent": False 
            }).execute()
            data = cast(List[Dict[str, Any]], doc_res.data)
            if data: document_id = data[0].get('id')

        if not document_id: raise RuntimeError("DB Insert Failed")

        # 3. Chunk
        chunks = chunker.split_text(markdown_content)
        data_payload: List[Dict[str, Any]] =[]

        print(f"Vectorizing {len(chunks)} chunks...")

        # 4. Embed (Batch prep)
        for i, chunk_text in enumerate(chunks):
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

        print(f"COMPLETE: {filename} indexed in the temporary vault.")

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
    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Protocol Violation: PDF Document Required.")

    try:
        os.makedirs(TEMP_DIR, exist_ok=True)
        file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{file.filename}"
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
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


# Helper to strictly sanitize NaN and Infinity values
def sanitize_float(val: Any) -> float:
    try:
        f_val = float(val)
        return f_val if math.isfinite(f_val) else 0.0
    except (TypeError, ValueError):
        return 0.0

@router.get("/telemetry")
async def get_system_telemetry(user_id: str = Depends(get_current_user)):
    if not db: return {"chunks": "--", "persistence": "--", "blocked": "--", "latency": "--"}
    
    try:
        docs_res = db.table("documents").select("id, is_permanent").eq("user_id", user_id).execute()
        docs = cast(List[Dict[str, Any]], docs_res.data)
        
        total_docs = len(docs)
        persisted_docs = sum(1 for d in docs if d.get("is_permanent", False))
        persistence_rate = f"{int((persisted_docs / total_docs) * 100)}%" if total_docs > 0 else "0%"
        
        chunks_res = db.table("document_chunks").select("id", count=cast(Any, "exact")).eq("user_id", user_id).execute()
        total_chunks = chunks_res.count if chunks_res.count else 0
        
        logs_res = db.table("audit_logs").select("faithfulness, precision, relevance, latency").eq("user_id", user_id).execute()
        logs = cast(List[Dict[str, Any]], logs_res.data)
        
        avg_faith = 0.0
        avg_prec = 0.0
        avg_rel = 0.0
        avg_latency = 0.0
        blocked = 0
        
        if logs:
            total_logs = len(logs)
            # Apply safe_float mapping to prevent sum(NaN) crashes
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
            "ragas": {
                "faithfulness": sanitize_float(avg_faith),
                "precision": sanitize_float(avg_prec),
                "relevance": sanitize_float(avg_rel)
            }
        }
    except Exception as e:
        print(f"❌ TELEMETRY ERROR: {e}")
        return {"chunks": "--", "persistence": "--", "blocked": "--", "latency": "--"}
