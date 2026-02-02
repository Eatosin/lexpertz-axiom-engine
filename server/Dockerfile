# Use a high-performance Python 3.11 slim image
FROM python:3.11-slim

# Install system-level dependencies for PDF parsing and OCR
RUN apt-get update && apt-get install -y \
    build-essential \
    libmagic-dev \
    poppler-utils \
    tesseract-ocr \
    libreoffice \
    pandoc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Command to run the production server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
