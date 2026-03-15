# RTSP Stream Worker

A Docker-based service that processes video streams, uploads processed video chunks to NVIDIA VSS (Video Storage Service), and provides HLS streaming via Cloudflare tunnels.

## Features

- **Video Stream Processing**: Captures and processes video files into HLS streams
- **HLS Streaming**: Converts videos to HLS format via MediaMTX for browser playback
- **Video Chunking**: Automatically splits videos into segments for upload
- **NVIDIA VSS Integration**: Uploads processed video chunks to NVIDIA's Video Storage Service
- **Cloudflare Tunnel**: Exposes HLS streams via public Cloudflare URLs (no port forwarding needed)
- **RESTful API**: Provides endpoints for stream management and status monitoring
- **CPU-Only Support**: No GPU required - runs on any server including AWS EC2

## Prerequisites

- Docker
- Access to NVIDIA VSS service (optional, for video analysis)
- AWS credentials (for S3 video source)

## Quick Start

### 1. Build the Docker Image

```bash
# Using docker compose
docker compose build

# Or manually
docker build -t rtsp-stream-worker:latest .
```

### 2. Environment Configuration

Create a `.env` file in the rtsp-stream-worker directory:

```bash
# NVIDIA VSS Configuration
NVIDIA_VSS_BASE_URL=http://your-nvidia-vss-container:8080

# AWS Configuration (for S3 video source)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_SOURCE_S3_BUCKET=your-bucket-name

# Stream limits (optional, default 4) - max concurrent FFmpeg streams to avoid CPU overload
MAX_CONCURRENT_STREAMS=4

# Grace period in seconds (optional, default 45) - after loading a preset, it won't be auto-unloaded for this long (avoids 404s when frontend gets URLs then another load_stream tears them down)
PRESET_GRACE_SECONDS=45
```

### 3. Running the Container

#### Option A: Docker Compose (Recommended)

```bash
docker compose up -d
```

#### Option B: Docker Run

```bash
docker run -d \
  --name rtsp-stream-worker \
  -p 8000:8000 \
  --env-file .env \
  rtsp-stream-worker:latest
```

#### Option C: Connect to Existing Docker Network

If your NVIDIA VSS service is running in a separate Docker container:

```bash
# Find the network name of your NVIDIA VSS container
docker network ls

# Run on the same network
docker run -d \
  --network twelve_labs_deployment_default \
  -p 8000:8000 \
  -e NVIDIA_VSS_BASE_URL=http://via-server:8080 \
  rtsp-stream-worker:latest
```

### 4. Verify It's Running

```bash
# Health check
curl http://localhost:8000/health

# View logs
docker logs rtsp-stream-worker
```

## Stream limits and CPU

Each preset (e.g. MachineryFactory, JapanConstruction) starts multiple FFmpeg transcoders (one per video). Loading several presets at once can exhaust CPU. To prevent this:

- **MAX_CONCURRENT_STREAMS** (env, default `4`): Maximum number of concurrent FFmpeg streams.
- **get_stream is the main entry point**: When the user opens a factory, call `POST /get_stream` with that preset name. The backend loads the preset if it isn’t loaded (unloading others as needed), then returns the HLS URLs. So clicking a factory always loads it and returns viewable URLs; no separate “load” then “get” step.
- **Automatic unloading**: When loading would exceed the cap, the backend automatically unloads other presets (respecting the grace period) until there is room, then starts as many streams from the requested preset as fit.
- **No errors to frontend**: Responses are always 200 with a list of HLS URLs (possibly fewer than the preset’s total if at cap).
- **Grace period**: After a preset is loaded, it is not auto-unloaded for `PRESET_GRACE_SECONDS` (default 45s), reducing 404s when the user switches quickly.
- **Docker**: `docker-compose.yml` sets a 2 CPU cap per container; adjust `cpus` and `MAX_CONCURRENT_STREAMS` for your instance size.

## API Endpoints

### Health Check
```
GET /health
```
Returns the health status of the service.

### Add Stream
```
POST /add_stream
Content-Type: application/json

{
  "stream_name": "your-stream-name",
  "s3_video_key": "path/to/video.mp4"
}
```

### Get Stream (main entry point – load on demand)
When the user clicks a factory site, call **get_stream**. It returns that preset’s HLS URLs and **loads the preset if it isn’t already loaded** (unloading other presets as needed under the cap). So one call both ensures the streams are running and returns the URLs to play.
```
POST /get_stream
Content-Type: application/json

{
  "stream_name": "JapanConstruction"
}
```
Returns `200` and a list of HLS URLs (e.g. `["https://.../Japan-Forklift-1/index.m3u8", ...]`). If the preset was unloaded earlier, it is loaded again automatically.

### Load Stream (alias)
`POST /load_stream` with the same body does the same thing as `get_stream` (kept for backward compatibility).
```
POST /load_stream
Content-Type: application/json

{
  "stream_name": "TextileFactory"
}
```

### Unload Stream (optional)
Stops all FFmpeg streams for a preset. Not required for switching—get_stream/load_stream auto-unload others when at `MAX_CONCURRENT_STREAMS`.
```
POST /unload_stream
Content-Type: application/json

{
  "stream_name": "MachineryFactory"
}
```

### Get Processing Status
```
POST /get_processing_status
Content-Type: application/json

{
  "stream_name": "your-stream-name"
}
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `NVIDIA_VSS_BASE_URL` | URL of the NVIDIA VSS service | Yes |
| `AWS_REGION` | AWS region for S3 | Yes |
| `AWS_ACCESS_KEY_ID` | AWS access key | Yes |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | Yes |
| `AWS_SOURCE_S3_BUCKET` | S3 bucket for video uploads | Yes |

### Video Processing Settings

The service automatically:
- Chunks videos into segments (video duration / 4 for videos > 60s)
- Uploads chunks to NVIDIA VSS for further processing
- Maintains processing status for each stream

## AWS EC2 Deployment

This service runs **CPU-only** and works on any EC2 instance:

### Recommended Instance Types
| Instance | vCPUs | RAM | Best For |
|----------|-------|-----|----------|
| t3.large | 2 | 8GB | Light testing |
| t3.xlarge | 4 | 16GB | Development |
| c5.xlarge | 4 | 8GB | Production (better CPU) |
| c5.2xlarge | 8 | 16GB | Heavy workloads |

### Security Group Configuration
| Port | Protocol | Description |
|------|----------|-------------|
| 8000 | TCP | FastAPI server (required) |
| 22 | TCP | SSH access |

> **Note**: Ports 8554, 1935, 8888 are **not required** to be open - video streaming goes through Cloudflare tunnels.

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│ Docker Container                                                  │
│                                                                   │
│  ┌─────────┐     RTSP      ┌──────────┐      HTTP     ┌────────┐ │
│  │ FFmpeg  │──────────────▶│ MediaMTX │─────────────▶│Cloudflare│ │
│  │(libx264)│  127.0.0.1   │(RTSP→HLS)│  localhost   │ Tunnel  │ │
│  └─────────┘    :8554      └──────────┘    :8888      └────────┘ │
│       │                                                    │      │
│       ▼                                                    │      │
│  ┌─────────┐                                               ▼      │
│  │  S3     │                              https://xxx.trycloudflare.com
│  │ Videos  │                                                      │
│  └─────────┘                                                      │
└──────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
                                            ┌──────────────┐
                                            │   Frontend   │
                                            │  (hls.js)    │
                                            └──────────────┘
```

## Troubleshooting

### Container Cannot Connect to NVIDIA VSS

**Error**: `Cannot connect to host localhost:8080`

**Solution**: Ensure both containers are on the same Docker network:
```bash
docker network ls
docker run --network twelve_labs_deployment_default ...
```

### Upload Failures

**Error**: `Upload completed: 0 successful, 1 failed`

**Solution**: Check logs for specific errors:
```bash
docker logs rtsp-stream-worker
```

Common causes:
- Network connectivity issues
- Invalid NVIDIA VSS URL
- Authentication problems

### Stream Not Playing in Browser

**Issue**: HLS stream not loading in frontend

**Solution**:
1. Check if Cloudflare tunnel is active in logs
2. Verify the HLS URL is accessible
3. Check browser console for CORS errors

## Development

### Local Development (Windows)

For local development without Docker:
1. Install Python 3.10+
2. Install FFmpeg
3. Download MediaMTX to `mediamtx/mediamtx.exe`
4. Run: `python main.py`

### Testing

```bash
# Health check
curl http://localhost:8000/health

# Add a stream
curl -X POST http://localhost:8000/add_stream \
  -H "Content-Type: application/json" \
  -d '{"stream_name": "test", "s3_video_key": "videos/test.mp4"}'
```
