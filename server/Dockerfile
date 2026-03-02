# 1. SOTA Base Image (Pinned for stability)
FROM python:3.11-slim

# 2. Environment Hardening
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    NLTK_DATA=/home/user/nltk_data

# 3. System Intelligence (Optimized for Docling V2 & RAGAS)
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

# 5. Pre-warm ML Dependencies (NLTK / Tiktoken cache)
RUN pip install --user nltk tiktoken
RUN python -m nltk.downloader -d $NLTK_DATA punkt_tab averaged_perceptron_tagger_eng

# 6. Dependency Hydration (Strategic Caching)
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 7. Application Ingestion
# Only copy the app code at the very end
COPY --chown=user . .

# 8. Port Specification (HF Default)
EXPOSE 7860

# 9. Start Engine (Production-Tuned)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers", "--forwarded-allow-ips", "*"]
