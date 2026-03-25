# 1. SOTA Base Image (Lean & Stable)
FROM python:3.11-slim

# 2. Environment Hardening
# HF_HUB_OFFLINE=1 ensures we don't try to download models during the build
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HUB_OFFLINE=0 

# 3. System Intelligence (Required for Docling V2 PDF Logic)
# Consolidation of system libs to reduce image layers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic-dev \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    libxml2-dev \
    libxslt-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# 4. Secure User Architecture (Hugging Face Standard)
RUN useradd -m -u 1000 user
USER user
WORKDIR $HOME/app

# 5. Dependency Hydration (The "One-Pass" Install)
# We copy ONLY requirements first to leverage Docker's cache
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 6. Application Ingestion
# Copy the rest of the code only after dependencies are locked
COPY --chown=user . .

# 7. Port Specification (HF Default)
EXPOSE 7860

# 8. Start Engine (SOTA Event Loop Optimization)
# --loop asyncio is MANDATORY for RAGAS 0.2/nest_asyncio compatibility
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--loop", "asyncio", "--proxy-headers", "--forwarded-allow-ips", "*"]
