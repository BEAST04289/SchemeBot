FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data and logs directories for persistence
RUN mkdir -p data logs

# Declare volumes for SQLite DB and JSONL evidence logs
VOLUME ["/app/data", "/app/logs"]

# Port is configurable: docker-compose sets 8000, Cloud Run sets 8080
ENV PORT=8000
EXPOSE ${PORT}

# Health check uses the configurable port
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health || exit 1

# Run with uvicorn — reads PORT from environment
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT} --workers 2
