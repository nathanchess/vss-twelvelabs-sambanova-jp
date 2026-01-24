# CPU-only base image - Ubuntu 22.04 LTS for maximum AWS EC2 compatibility
FROM ubuntu:22.04

# Environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV TZ=UTC

# Install all system dependencies
# - Python 3.10 (default in Ubuntu 22.04, well-tested with ML packages)
# - FFmpeg with libx264 for CPU video encoding
# - OpenCV dependencies (libgl1, libglib2.0-0, libsm6, libxext6, libxrender1)
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-dev \
    python3-venv \
    curl \
    wget \
    ffmpeg \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    && rm -rf /var/lib/apt/lists/*

# Install MediaMTX (RTSP server)
RUN curl -L -o mediamtx.tar.gz https://github.com/bluenviron/mediamtx/releases/download/v1.6.0/mediamtx_v1.6.0_linux_amd64.tar.gz && \
    tar -xzf mediamtx.tar.gz && \
    mv mediamtx /usr/local/bin/ && \
    rm mediamtx.tar.gz

# Install Cloudflared (tunnel)
RUN curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb && \
    dpkg -i cloudflared.deb && \
    rm cloudflared.deb

# Set working directory
WORKDIR /app

# Create virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip to latest
RUN pip install --no-cache-dir --upgrade pip

# Copy requirements first (Docker layer caching optimization)
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p temp preset

# Expose ports
# 8000 = FastAPI server
# 8554 = RTSP server
# 1935 = RTMP server  
# 8888 = HLS server
EXPOSE 8000 8554 1935 8888

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application
CMD ["python3", "main.py"]