## Frontend (Next.js) — TwelveLabs × SambaNova

This is the Next.js app that powers the search, analysis, agent chatbot, and reporting UI for the manufacturing compliance automation system.

### 🌐 Japanese Localization (i18n)

This application includes full Japanese language support powered by **SambaNova's Llama-3.3-Swallow-70B-Instruct model**.

#### Features
- **Language Toggle**: Switch between English (🇺🇸) and Japanese (🇯🇵) via the UI toggle
- **Static Translations**: 150+ pre-translated UI strings in `src/app/lib/translations.js`
- **Dynamic Translation API**: Real-time translation of dynamic content (compliance reports, AI responses) via `/api/translate`
- **Persisted Preference**: Language preference is saved to `localStorage`

#### How It Works
1. **Static Content**: UI labels, buttons, and messages use the `t()` helper from `translations.js`
2. **Dynamic Content**: AI-generated content is translated on-demand using SambaNova's Swallow model
3. **Context Provider**: `LanguageContext` wraps the app to provide global language state

#### Key Files
- `src/app/lib/translations.js` — Static translation dictionary (EN/JP)
- `src/app/context/LanguageContext.js` — React context for language state
- `src/app/api/translate/route.js` — API route for dynamic translation via SambaNova
- `src/app/components/LanguageToggle.js` — UI component for language switching

### Environment Variables

Create a `.env.local` in `frontend/` with the following keys:

```bash
# AWS (S3 source videos)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION=""
AWS_SOURCE_S3_BUCKET='source-bucket'

# TwelveLabs
TWELVELABS_API_KEY=""
NEXT_PUBLIC_TWELVELABS_MARENGO_INDEX_ID=""
NEXT_PUBLIC_TWELVELABS_PEGASUS_INDEX_ID=""

# SambaNova (Japanese Translation)
SAMBANOVA_API_KEY=""

# Services
NEXT_PUBLIC_RTSP_STREAM_WORKER_URL="http://localhost:8000/"
```

For production, rotate and store secrets securely (e.g., Vercel env, Vault).

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000 to use the app.

### Features

- 🎬 Action video with live HLS streams
- 🔍 Video search and chaptering via TwelveLabs Marengo
- 🤖 Agent chatbot for Q&A over videos (TwelveLabs Pegasus)
- 📊 Instant compliance report generator
- 📤 Upload and analyze videos
- 🌐 Full English/Japanese language support

### Assets & Branding

Logos in `public/` are used for branding and partner acknowledgements.
