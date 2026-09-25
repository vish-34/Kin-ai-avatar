# Multi-stage Dockerfile for KIN AI Production Backend
# Combines Node.js 20 and Python 3.10 to run Express API and internal CloneLLM microservice

FROM node:20-bookworm-slim AS base

# Install Python 3.10 and build dependencies
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Install Node.js Dependencies
COPY package*.json ./
RUN npm ci --only=production

# 2. Install Python Dependencies in a Virtual Environment
COPY python/clone_service/requirements.txt ./python/clone_service/
RUN python3 -m venv /opt/venv && \
    /opt/venv/bin/pip install --no-cache-dir --upgrade pip && \
    /opt/venv/bin/pip install --no-cache-dir -r ./python/clone_service/requirements.txt

# 3. Copy Application Source Code
COPY . .

# Environment paths
ENV PATH="/opt/venv/bin:$PATH"
ENV NODE_ENV=production
ENV PORT=5000
ENV PYTHON_SERVICE_URL=http://127.0.0.1:5001

EXPOSE 5000

# Startup script launching Python CloneLLM service in background and Node.js in foreground
CMD /opt/venv/bin/python python/clone_service/internal_server.py & node src/server.js
