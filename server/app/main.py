import os
from dotenv import load_dotenv

# SOTA: Load environment variables BEFORE any AI components initialize.
# This guarantees LangSmith telemetry hooks attach correctly.
load_dotenv()

import nest_asyncio
nest_asyncio.apply()

import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

# Axiom Core Imports
from app.api import ingest, run, history, vault, keys 
from app.core.database import db

# --- SOTA: Lifespan Management ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("AXIOM_CORE: Logic Core Initialized. Dependencies Warm.")
    print("AXIOM_CORE: LangSmith Telemetry Active." if os.getenv("LANGCHAIN_TRACING_V2") == "true" else "AXIOM_CORE: Telemetry Offline.")
    yield
    print("AXIOM_CORE: System Offboarding Complete.")

app = FastAPI(
    title="Axiom Engine API",
    description="V4.6 Sovereign Evidence-Gated Intelligence (Multilingual)",
    version="4.6.0",
    lifespan=lifespan
)

# --- SOTA: Performance Middleware ---
app.add_middleware(GZipMiddleware, minimum_size=500)

# --- SOTA: Strict CORS Security ---
origins =[
    "http://localhost:3000",
    "https://axiom-engine-six.vercel.app",
    "https://lexpertz-axiom-engine.vercel.app", 
    "https://huggingface.co",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*-lexpertzai-projects\.vercel\.app", 
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
        "version": "4.6.0",
        "vault_link": db_status,
        "engine": "Axiom Sovereign V4.6",
        "architect": "meta/llama-3.3-70b-instruct",
        "vector_core": "nvidia/llama-nemotron-embed-1b-v2"
    }
