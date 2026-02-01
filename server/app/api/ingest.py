from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
import shutil
import os
import uuid
from app.core.database import db
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from unstructured.partition.pdf import partition_pdf # Heavy import

router = APIRouter()
TEMP_DIR = "/tmp/axiom_ingest"

# --- Async Worker for Heavy Processing ---
async def process_document(file_path: str, filename: str, user_id: str):
    """
    Background Task: 
    1. Parse PDF -> Text
    2. Split -> Chunks
    3. Embed -> Vectors
    4. Store -> Supabase
    """
    try:
        # 1. Parsing (The Heavy Lift)
        # Note: 'fast' strategy skips OCR for speed. Use 'hi_res' for scans.
        elements = partition_pdf(filename=file_path, strategy="fast")
        full_text = "\n".join([str(el) for el in elements])

        # 2. Register Document in DB
        if db:
            doc_res = db.table("documents").insert({
                "filename": filename,
                "user_id": user_id,
                "status": "processing"
            }).execute()
            document_id = doc_res.data[0]['id']

        # 3. Chunking
        chunks = chunker.split_text(full_text)

        # 4. Vectorization & Storage Loop
        data_payload = []
        for i, chunk_text in enumerate(chunks):
            vector = get_embedding(chunk_text)
            
            data_payload.append({
                "document_id": document_id,
                "user_id": user_id,
                "content": chunk_text,
                "embedding": vector,
                "metadata": {"chunk_index": i, "source": filename}
            })

        # Batch Insert to Supabase
        if db:
            db.table("document_chunks").insert(data_payload).execute()
            
            # Update Status
            db.table("documents").update({"status": "indexed"}).eq("id", document_id).execute()

        print(f"Successfully indexed {len(chunks)} chunks for {filename}")

    except Exception as e:
        print(f"Processing Error: {str(e)}")
        if db: # Mark as failed
             db.table("documents").update({"status": "error"}).eq("filename", filename).execute()
    finally:
        # Cleanup temp file
        if os.path.exists(file_path):
            os.remove(file_path)

# --- Endpoint ---
@router.post("/upload")
async def ingest_document(
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...)
):
    # TODO: Get real user_id from Clerk Headers later
    MOCK_USER_ID = "00000000-0000-0000-0000-000000000000" 

    if not file.filename or not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    try:
        os.makedirs(TEMP_DIR, exist_ok=True)
        file_path = f"{TEMP_DIR}/{uuid.uuid4()}_{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Hand off to background worker so API doesn't hang
        background_tasks.add_task(process_document, file_path, file.filename, MOCK_USER_ID)
        
        return {
            "status": "queued",
            "filename": file.filename,
            "message": "Ingestion started in background."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload Failed: {str(e)}")
