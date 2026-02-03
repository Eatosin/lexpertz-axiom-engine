# 1. SOTA Base Image
FROM python:3.11-slim

# 2. System Intelligence (Needed for PDF/OCR)
# We add these to ensure Unstructured/pdf2image don't crash
RUN apt-get update && apt-get install -y \
    build-essential \
    libmagic-dev \
    poppler-utils \
    tesseract-ocr \
    && rm -rf /var/lib/apt/lists/*

# 3. Secure User Architecture
# Hugging Face requires UID 1000. 
# We setup the user FIRST to ensure all future files are owned by 'user'
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# 4. Dependency Hydration
# We use --user to stay within HF's sandbox permissions
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 5. Application Ingestion
COPY --chown=user . .

# 6. Port Specification
# HF strictly maps to 7860
EXPOSE 7860

# 7. Start Engine (No CORS flags needed here because we handle it in main.py)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
