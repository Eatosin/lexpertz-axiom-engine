from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Initialize the Enterprise API
app = FastAPI(
    title="Axiom Engine API",
    description="Evidence-Gated Reasoning Engine with Hybrid Inference Support",
    version="1.0.0"
)

# --- SOTA Security: CORS Configuration ---
# Allow the Frontend (Client) to talk to the Backend
origins = [
    "http://localhost:3000",      # Local Development
    "https://lexpertz.ai",        # Production Domain (Future)
    "https://*.vercel.app"        # Vercel Preview Deployments
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- The Health Check ---
@app.get("/health")
async def health_check():
    return {
        "status": "online",
        "module": "Axiom Logic Core",
        "inference_mode": "hybrid_ready" # Signals UI that Toggle is supported
    }

# --- The Inference Configuration Schema ---
# This is the Pydantic model for my "Toggle" logic.
class InferenceConfig(BaseModel):
    provider: str  # "groq" | "ollama"
    model_id: str  # "llama3-70b-8192" | "llama3"
    base_url: str | None = None # Required if provider is 'ollama'

@app.post("/api/v1/configure-inference")
async def configure_inference(config: InferenceConfig):
    """
    Switch between Cloud (Groq) and Sovereign (Local) modes.
    """
    # TODO: Implement the Factory Pattern here in next step
    return {
        "message": f"Inference context switched to {config.provider.upper()}",
        "active_model": config.model_id
    }
