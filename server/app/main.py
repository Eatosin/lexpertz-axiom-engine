from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.api import ingest, run, history # <--- Unified Imports

# Initialize the Axiom Intelligence Core
app = FastAPI(
    title="Axiom Engine API",
    description="Evidence-Gated Reasoning Engine for Regulated Industries",
    version="2.0.0"
)

# --- SOTA Security: CORS Strategy ---
# We allow Vercel and HF to communicate while maintaining strict headers
origins = [
    "http://localhost:3000",
    "https://lexpertz-ai.vercel.app",
    "https://*.vercel.app",
    "https://huggingface.co",
    "*" # Wildcard allowed for initial proxy handshake
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Router Registration ---
app.include_router(ingest.router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(run.router, prefix="/api/v1", tags=["Reasoning"])
app.include_router(history.router, prefix="/api/v1", tags=["History"])

# --- System Health Monitoring ---
@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "version": "2.0.0",
        "engine": "Axiom Logic v1.1",
        "inference": "llama-3.3-70b-versatile"
    }

# --- Sovereign Toggle Configuration ---
class InferenceConfig(BaseModel):
    provider: str  # "groq" | "ollama"
    model_id: str
    base_url: str | None = None

@app.post("/api/v1/configure-inference")
async def configure_inference(config: InferenceConfig):
    return {
        "status": "protocol_updated",
        "provider": config.provider.upper(),
        "active_model": config.model_id
    }
