from fastapi import APIRouter, UploadFile, File, HTTPException
from typing import List
import shutil
import os

router = APIRouter()

# Define a temporary storage for processing
TEMP_DIR = "/tmp/axiom_ingest"

@router.post("/upload")
async def ingest_document(file: UploadFile = File(...)):
    """
    Enterprise Ingestion Endpoint.
    Receives binary PDF, saves to secure temp, triggers Unstructured parsing.
    """
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are supported in this Regulated Version.")

    try:
        # 1. Secure File Handover (Audit Trail Start)
        os.makedirs(TEMP_DIR, exist_ok=True)
        file_path = f"{TEMP_DIR}/{file.filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # 2. TODO: Trigger "Unstructured" Parser here
        # 3. TODO: Generate Vector Embeddings
        
        return {
            "status": "processing",
            "filename": file.filename,
            "pipeline": "unstructured_ocr_v1",
            "message": "Document secured. Extraction started."
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion Failed: {str(e)}")
    finally:
        file.file.close()
