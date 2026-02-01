from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
import shutil
import os
import uuid
from typing import Optional, List, Any, cast # Added cast for type safety
from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding

# type: ignore for heavy libs not installed in CI
from unstructured.partition.pdf import partition_pdf # type: ignore 

router = APIRouter()
TEMP_DIR = "/tmp/axiom_ingest"

async def process_document(file_path: str, filename: str, user_id: str) -> None:
    """
    Background worker with strict Type Casting for Enterprise compliance.
    """
    try:
        # 1. Extraction
        elements = partition_pdf(filename=file_path, strategy="fast")
        full_text = "\n".join([str(el) for el in elements])

        # 2. Database Handshake
        document_id: Optional[int] = None
        
        if db:
            doc_res = db.table("documents").insert({
                "filename": filename,
                "user_id": user_id,
                "status": "processing"
            }).execute()
            
            # --- FIX: Type Casting Supabase Response ---
            # We tell MyPy that doc_res.data is definitely a list of dicts
            data = cast(List[dict[str, Any]], doc_res.data)
            if data and len(data) > 0:
                document_id = data[0].get('id')

        if document_id is None:
            raise RuntimeError("Failed to register document in Vault.")

        # 3. Processing Loop
        chunks = chunker.split_text(full_text)
        # Using List[Any] to simplify the complex dict structure for MyPy
        data_payload: List[Any] = []
        
        for i, chunk_text in enumerate(chunks):
            vector = get_embedding(chunk_text)
            data_payload.append({
                "document_id": document_id,
                "user_id": user_id,
                "content": chunk_text,
                "embedding": vector,
                "metadata": {"index": i, "source": filename}
            })

        # 4. Final Commit
        if db:
            # Cast payload to Any to bypass Supabase's strict Union type check
            db.table("document_chunks").insert(cast(Any, data_payload)).execute()
            db.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()

        print(f"Indexed {len(data_payload)} segments for {filename}")

    except Exception as e:
        print(f"Pipeline Failure: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/upload")
async def ingest_document(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    MOCK_USER_ID = "00000000-0000-0000-0000-000000000000"

    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="PDF Required.")

    os.makedirs(TEMP_DIR, exist_ok=True)
    file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{file.filename}"
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    background_tasks.add_task(process_document, file_path, file.filename, MOCK_USER_ID)
    
    return {"status": "queued", "filename": file.filename}
