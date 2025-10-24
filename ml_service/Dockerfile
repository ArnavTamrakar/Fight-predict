# syntax=docker/dockerfile:1
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*

# Copy requirements and install
COPY ml_service/ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy your FastAPI app and model
COPY ml_service/ml ./ml

# Set the working directory where app.py lives
WORKDIR /app/ml

# Tell Cloud Run what port to expose
ENV PORT=8080

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8080"]
