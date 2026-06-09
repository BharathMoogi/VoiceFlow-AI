# Dockerfile for VoiceFlow-AI FastAPI backend
FROM python:3.12-slim

# Set work directory
WORKDIR /app

# Install OS dependencies (for psycopg2, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the application source code
COPY . .

# Expose port for FastAPI
EXPOSE 8000
# Command to run migrations then start server
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
