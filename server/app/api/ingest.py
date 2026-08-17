import os
import uuid
import math
import asyncio
from typing import Optional, List, Any, Dict
from pathlib import Path as FilePath
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends, Path
from pydantic import BaseModel

from app.core.adapters import get_vault
from app.core.chunking import chunker
from app.core.embeddings import get_embedding
from app.core.auth import get_current_user
from app.core.axiom_paths import get_temp_dir
from app.core.parsers import dispatch_parser

router = APIRouter()

SUPPORTED_EXTENSIONS = {".pdf", ".xlsx", ".csv", ".xls"}


async def fetch_embedding_concurrently(chunk_text: str, semaphore: asyncio.Semaphore) -> List[float]:
    """Bounds concurrent embedding requests to respect provider rate limits."""
    async with semaphore:
        return await asyncio.to_thread(get_embedding, chunk_text, input_type="document")


async def process_document(file_path: str, filename: str, user_id: str) -> None:
    """Parse → chunk → embed → store pipeline against the local vault."""
    try:
        print(f"AXIOM-CORE: Parsing {filename} (Async Mode)")

        vault = get_vault()
        document_id: Optional[int] = await vault.store_document(filename)
        if not document_id:
            raise RuntimeError("Vault document registration failed.")

        markdown_content = await asyncio.to_thread(dispatch_parser, file_path)

        chunks = chunker.split_text(markdown_content)
        print(f"AXIOM-CORE: Vectorizing {len(chunks)} chunks concurrently...")

        semaphore = asyncio.Semaphore(5)
        tasks = [fetch_embedding_concurrently(chunk, semaphore) for chunk in chunks]
        vectors = await asyncio.gather(*tasks)

        for i, (chunk_text, vector) in enumerate(zip(chunks, vectors)):
            await vault.store_chunk(document_id, chunk_text, vector, i)

        await vault.update_document_status(document_id, "indexed")
        print(f"COMPLETE: {filename} indexed successfully.")

    except Exception as e:
        print(f"INGESTION FAILED: {str(e)}")
        if document_id:
            try:
                await vault.update_document_status(document_id, "error")
            except Exception as status_err:
                print(f"STATUS UPDATE FAILED: {status_err}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)


@router.post("/upload")
async def ingest_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user),
):
    """File Upload Handler with Path Traversal Protection"""
    if not file.filename or not FilePath(file.filename).suffix.lower() in SUPPORTED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Protocol Violation: Unsupported file type. Allowed: {sorted(SUPPORTED_EXTENSIONS)}")

    try:
        temp_dir = get_temp_dir()
        os.makedirs(temp_dir, exist_ok=True)
        safe_filename = os.path.basename(file.filename)
        file_path = f"{temp_dir}/{uuid.uuid4()}_{safe_filename}"

        content = await file.read()
        await asyncio.to_thread(lambda: open(file_path, "wb").write(content))

        background_tasks.add_task(process_document, file_path, safe_filename, user_id)

        return {"status": "queued", "filename": safe_filename}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{filename}")
async def get_ingestion_status(filename: str = Path(...), user_id: str = Depends(get_current_user)):
    vault = get_vault()
    doc = await vault.get_document_by_filename(filename)
    return {"status": doc["status"] if doc else "not_found"}


@router.get("/latest")
async def get_latest_document(user_id: str = Depends(get_current_user)):
    vault = get_vault()
    docs = await vault.list_documents(limit=1)
    if not docs:
        return {"status": "none"}
    return {"status": "success", "filename": docs[0]["filename"], "doc_status": docs[0]["status"]}


@router.get("/metadata/{filename}")
async def get_document_metadata(filename: str = Path(...), user_id: str = Depends(get_current_user)):
    vault = get_vault()
    doc = await vault.get_document_by_filename(filename)
    if not doc:
        return {"status": "not_found"}
    return {
        "filename": filename,
        "status": doc.get("status"),
        "created_at": doc.get("created_at"),
        "chunk_count": doc.get("chunk_count", 0),
        "is_permanent": doc.get("is_permanent", False),
    }


class SaveRequest(BaseModel):
    filename: str


@router.post("/save")
async def save_document_to_vault(req: SaveRequest, user_id: str = Depends(get_current_user)):
    vault = get_vault()
    if await vault.set_document_permanent(req.filename):
        return {"status": "persisted"}
    return {"status": "error"}


@router.delete("/documents/{filename}")
async def delete_document(filename: str = Path(...), user_id: str = Depends(get_current_user)):
    vault = get_vault()
    if not await vault.delete_document(filename):
        raise HTTPException(status_code=404, detail="Document not found")
    return {"status": "purged", "filename": filename}


def sanitize_float(val: Any) -> float:
    try:
        f_val = float(val)
        return f_val if math.isfinite(f_val) else 0.0
    except (TypeError, ValueError):
        return 0.0


@router.get("/telemetry")
async def get_system_telemetry(user_id: str = Depends(get_current_user)):
    """Async offloaded telemetry aggregation from the local vault."""
    try:
        vault = get_vault()
        telemetry = await vault.get_telemetry()
        docs = await vault.list_documents(limit=None)

        total_docs = len(docs)
        persisted_docs = sum(1 for d in docs if d.get("is_permanent", False))
        persistence_rate = f"{int((persisted_docs / total_docs) * 100)}%" if total_docs > 0 else "0%"

        logs = await vault.list_audit_logs(limit=50)

        avg_faith, avg_prec, avg_rel, avg_latency, blocked = 0.0, 0.0, 0.0, 0.0, 0

        if logs:
            total_logs = len(logs)
            avg_faith = sum(sanitize_float(l.get("faithfulness", 0.0)) for l in logs) / total_logs
            avg_prec = sum(sanitize_float(l.get("precision", 0.0)) for l in logs) / total_logs
            avg_rel = sum(sanitize_float(l.get("relevance", 0.0)) for l in logs) / total_logs
            blocked = sum(1 for l in logs if sanitize_float(l.get("faithfulness", 0.0)) < 0.8)

            valid_latencies = [sanitize_float(l.get("latency", 0.0)) for l in logs if sanitize_float(l.get("latency", 0.0)) > 0]
            if valid_latencies:
                avg_latency = sum(valid_latencies) / len(valid_latencies)

        return {
            "chunks": str(telemetry.get("chunks", 0)),
            "persistence": persistence_rate,
            "blocked": str(blocked),
            "latency": f"{sanitize_float(avg_latency):.1f}s",
            "ragas": {"faithfulness": sanitize_float(avg_faith), "precision": sanitize_float(avg_prec), "relevance": sanitize_float(avg_rel)},
        }
    except Exception as e:
        print(f"TELEMETRY ERROR: {e}")
        return {"chunks": "--", "persistence": "--", "blocked": "--", "latency": "--"}
