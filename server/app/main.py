from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.api import ingest 
from app.api import run  # <--- 1. Import the new module

# Initialize the Enterprise API.
app = FastAPI(
    title="Axiom Engine API",
    description="Evidence-Gated Reasoning Engine with Hybrid Inference Support",
    version="1.0.0"
)

# --- SOTA Security: CORS Configuration ---
origins = [
    "http://localhost:3000",      
    "https://lexpertz.ai",        
    "https://*.vercel.app"        
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Register Modular Routers ---
app.include_router(ingest.router, prefix="/api/v1", tags=["Ingestion"])
app.include_router(run.router, prefix="/api/v1", tags=["Reasoning"]) # <--- 2. Register the router

# --- The Health Check ---
@app.get("/health")
async def health_check():
    return {
        "status": "online", 
        "module": "Axiom Logic Core",
        "inference_mode": "hybrid_ready"
    }

# --- The Inference Configuration Schema ---
class InferenceConfig(BaseModel):
    provider: str 
    model_id: str 
    base_url: str | None = None 

@app.post("/api/v1/configure-inference")
async def configure_inference(config: InferenceConfig):
    return {
        "message": f"Inference context switched to {config.provider.upper()}",
        "active_model": config.model_id
    }
