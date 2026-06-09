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

# Copy and set up the start script
COPY start.sh .
RUN chmod +x start.sh

# Command to run the app
CMD ["./start.sh"]
