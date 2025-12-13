# Dockerfile — CPU PyTorch installed from official wheels (works on Docker Desktop)
FROM python:3.10-slim

# metadata
LABEL maintainer="aribafaryad <aribafaryad@gmail.com>"

WORKDIR /app

# Avoid interactive prompts and install small system deps needed for some packages
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential git curl ffmpeg ca-certificates libsndfile1 libpq-dev \
  && rm -rf /var/lib/apt/lists/*

# Copy minimal requirements first for caching
COPY requirements.txt /app/requirements.txt

# Upgrade pip/tools
RUN pip install --upgrade pip setuptools wheel

# Install CPU PyTorch & audio/vision extras from official PyTorch CPU index.
# This avoids depending on an uncertain `pytorch/pytorch` docker tag.
# The --index-url below points pip to the official PyTorch CPU wheel repository.
RUN pip install --index-url https://download.pytorch.org/whl/cpu \
    "torch" "torchvision" "torchaudio" || true

# Then install the rest of requirements (remove torch/transformers from file if you prefer)
RUN pip install -r /app/requirements.txt

# Copy the rest of the repo
# Copy only source code & requirements explicitly
COPY requirements.txt /app/requirements.txt
COPY sentiment_pipeline /app/sentiment_pipeline
COPY trend_prediction /app/trend_prediction
COPY scripts /app/scripts
COPY twitter /app/twitter
COPY api_server.py /app/api_server.py
# add other specific files/folders you actually need

# Create non-root user
RUN useradd --create-home appuser && chown -R appuser:appuser /app
USER appuser

# Default command (fallback) — change to whichever worker you want as default
CMD ["python", "sentiment_pipeline/news/news.py"]
