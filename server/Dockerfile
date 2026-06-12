FROM node:20-bookworm-slim

WORKDIR /app

# Install system dependencies required for Python, pip, and PyMuPDF
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    libffi-dev \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a Python virtual environment and install dependencies
# We use a venv to avoid PEP 668 externally-managed-environment errors
ENV VIRTUAL_ENV=/opt/venv
RUN python3 -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Copy package files first for caching
COPY package.json package-lock.json* ./
COPY requirements.txt ./

# Install Node and Python dependencies
RUN npm install
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code and Prisma schema
COPY . .

# Generate Prisma client and build TypeScript
RUN npx prisma generate
RUN npm run build

# Expose API port
EXPOSE 3001

# The start script should push db migrations and then start the server
CMD ["sh", "-c", "npx prisma db push && npm run start"]
