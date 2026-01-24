## NVIDIA GTC 2025 — TwelveLabs × NVIDIA VSS × SambaNova: Real‑Time Manufacturing Compliance with Japanese Localization

### Live Video Demo
[![Live Video Demo](https://img.youtube.com/vi/opYVHSc77ZQ/maxresdefault.jpg)](https://www.youtube.com/watch?v=opYVHSc77ZQ&feature=youtu.be)

### Architecture
![System Architecture](assets/architecture.png)

### Lucidchart
- Interactive architecture diagram: [Lucidchart](https://lucid.app/lucidchart/6b6215f6-b49d-4ca5-92a4-e677dba3eb12/edit?invitationId=inv_b73efd38-0dde-43ef-8477-e1ae471f0aa1)

### Overview

This project is a close‑to‑real‑time manufacturing compliance automation system that integrates **TwelveLabs video intelligence** with **NVIDIA Video Search and Summarization (VSS)**. It continuously ingests live or archived video, runs computer‑vision PPE compliance checks, chunks processed video to NVIDIA VSS for indexing, and powers a frontend for search, analysis, and reporting.

The application includes **full Japanese language localization** powered by **SambaNova's Llama-3.3-Swallow-70B-Instruct model**, enabling seamless English ↔ Japanese translation of both static UI elements and dynamic AI-generated content.

### Key Features

- 🎬 **Actionable video analytics** with TwelveLabs and NVIDIA VSS
- 🤖 **Agent chatbot** for video Q&A and insights
- 📊 **Instant compliance report creator** (per shift/factory)
- 📡 **Live stream simulation** via RTSP worker with HLS playback
- 🎬 **Video chaptering**, event timeline, and clip generation
- 🌐 **Japanese localization** via SambaNova Swallow model

### Japanese Localization (i18n)

This project demonstrates real-time Japanese language support for industrial video AI applications:

| Component | Technology |
|-----------|------------|
| Static UI Text | Pre-translated dictionary with 150+ strings |
| Dynamic Content | SambaNova Llama-3.3-Swallow-70B-Instruct |
| State Management | React Context with localStorage persistence |
| Translation API | Next.js API route at `/api/translate` |

Users can toggle between English (🇺🇸) and Japanese (🇯🇵) at any time. All AI-generated compliance reports, chat responses, and video analysis summaries are translated on-demand.

### Repository Structure

- `frontend/`: Next.js app for search, analytics, reporting UI, and Japanese localization
- `rtsp-stream-worker/`: FastAPI + MediaMTX worker for RTSP/HLS, chunking, and uploads to NVIDIA VSS
- `cv_model/`: PPE detection training scripts and training results
- `assets/`: Images and diagrams (e.g., `architecture.png`)

### Related NVIDIA VSS Blueprint

- Forked baseline and concepts are informed by NVIDIA's blueprint: [NVIDIA VSS Repo (fork)](https://github.com/james-le-twelve-labs/nvidia-vss)

### Getting Started (High‑Level)

1) See `frontend/README.md` to configure environment variables (including SambaNova API key) and run the UI.
2) See `rtsp-stream-worker/README.md` to run the worker (Docker) and enable live streams and processing.
3) See `cv_model/README.md` for background on PPE model training and results.

### Notes on Credentials

Environment variables are required for AWS, TwelveLabs, SambaNova, and NVIDIA VSS endpoints. Place them in the respective `.env` files as described in sub‑module READMEs. Treat any shared keys as development‑only and rotate for production.
