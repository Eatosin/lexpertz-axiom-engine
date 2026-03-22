import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from app.api import ingest, run, history, vault, keys 
from app.core.database import db # For health check verification

# --- SOTA: Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup Logic: Log system readiness
    print("AXIOM_CORE: Logic Core Initialized. Dependencies Warm.")
    yield
    # Shutdown Logic: Clean up resources if necessary
    print("AXIOM_CORE: System Offboarding Complete.")

app = FastAPI(
    title="Axiom Engine API",
    description="V4.0 Sovereign Evidence-Gated Intelligence",
    version="4.0.0",
    lifespan=lifespan
)

# --- SOTA: Performance Middleware ---
# Compresses JSON responses over 500 bytes. Crucial for large RAG contexts.
app.add_middleware(GZipMiddleware, minimum_size=500)

# --- SOTA: Strict CORS Security ---
# Fixed the Wildcard/Credential conflict to prevent browser blocks
origins =[
    "http://localhost:3000",
    "https://axiom-engine-six.vercel.app",
    "https://lexpertz-axiom-engine.vercel.app", 
    "https://huggingface.co",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https://.*-lexpertzai-projects\.vercel\.app", # SOTA: Dynamic Vercel Previews
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# --- SOTA: Telemetry Middleware ---
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(round(process_time, 4))
    return response

# --- Router Registration ---
app.include_router(ingest.router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(run.router, prefix="/api/v1", tags=["Reasoning"])
app.include_router(history.router, prefix="/api/v1", tags=["History"])
app.include_router(vault.router, prefix="/api/v1/vault", tags=["Vault"])
app.include_router(keys.router, prefix="/api/v1/keys", tags=["API Keys"])

# --- System Health Monitoring ---
@app.get("/health")
async def health_check():
    db_status = "online" if db else "offline"
    return {
        "status": "operational",
        "version": "4.0.0",
        "vault_link": db_status,
        "engine": "Axiom Sovereign V4",
        "judge": "llama-3.3-70b-instruct"
    }
