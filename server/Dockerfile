# 1. SOTA Base Image
FROM python:3.11-slim

# 2. System Intelligence (Vision & PDF Support)
RUN apt-get update && apt-get install -y \
    build-essential \
    libmagic-dev \
    poppler-utils \
    tesseract-ocr \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir nltk
RUN python -m nltk.downloader -d /usr/share/nltk_data punkt_tab averaged_perceptron_tagger_eng

# 3. Secure User Architecture
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# 4. Dependency Hydration
COPY --chown=user requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# 5. Application Ingestion
COPY --chown=user . .

# 6. Port Specification
EXPOSE 7860

# 7. Start Engine
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
