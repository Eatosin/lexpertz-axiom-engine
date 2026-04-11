# 1. SOTA Base Image (Lean & Stable)
FROM python:3.11-slim

# 2. Environment Hardening
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    HF_HUB_OFFLINE=0 

# 3. System Intelligence (Hardened for Docling V2 & Python-Magic)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libmagic1 \
    libmagic-dev \
    libgomp1 \
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

# 5. Ingestion Buffer Setup
# Ensure the temp directory for Docling exists and is writable
RUN mkdir -p /tmp/axiom_ingest && chmod 777 /tmp/axiom_ingest

# 6. Dependency Hydration
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 7. Application Ingestion
COPY --chown=user . .

# 8. Port Specification
EXPOSE 7860

# 9. Start Engine (SOTA Event Loop Optimization)
# --loop asyncio is mandatory for RAGAS 0.2/nest_asyncio compatibility
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--loop", "asyncio", "--proxy-headers", "--forwarded-allow-ips", "*"]
