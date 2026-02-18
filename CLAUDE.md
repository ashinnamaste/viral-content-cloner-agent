# CLAUDE.md — Viral Content Cloner Agent

This file provides context for AI assistants working in this repository.

---

## Project Overview

**Viral Content Cloner Agent** is a full-stack web application that:

1. Scrapes the most popular (most-viewed) videos from any YouTube channel using `yt-dlp`.
2. Extracts transcripts/subtitles for each video via the Apify `YouTube Transcript Extractor` actor.
3. Sends the collected transcripts to **Google Gemini AI** to reverse-engineer the creator's "Viral DNA" — hook patterns, retention loops, sentence rhythm, and fill-in-the-blank script templates.
4. Generates a custom viral script for a user-supplied topic using that Viral DNA as the AI system prompt.

Real-time progress updates flow from the Flask backend to the React frontend over **Socket.IO**.

---

## Repository Structure

```
viral-content-cloner-agent/
├── backend/
│   ├── app.py            # Flask server — REST API + Socket.IO event handlers
│   ├── extractor.py      # YouTube scraping (yt-dlp) + Apify transcript logic
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Single-page React UI (all UI logic lives here)
│   │   ├── main.jsx      # React entry point
│   │   └── index.css     # Global CSS (Tailwind base)
│   ├── index.html        # HTML shell
│   ├── package.json      # Node dependencies + scripts
│   ├── vite.config.js    # Vite dev server (port 3100)
│   ├── tailwind.config.js
│   └── postcss.config.js
├── .env.example          # Required environment variable template
├── .gitignore
├── start.sh              # One-command startup (Mac/Linux)
├── start.bat             # One-command startup (Windows)
├── README.md
└── QUICKSTART.md
```

---

## Architecture

### Backend (`backend/app.py`)

- **Framework**: Flask 3.0 + Flask-SocketIO 5.3
- **Port**: `5002` (hardcoded in `app.py` — note README/QUICKSTART incorrectly show 5000)
- **CORS**: All origins allowed (`flask-cors`)

**Key in-memory state** (process-lifetime, not persisted):

| Variable | Purpose |
|---|---|
| `extraction_status` | Tracks running/progress/message/status of the current extraction job |
| `extracted_subtitles` | Stores raw transcript text + video count after extraction |

**REST endpoints**:

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/extract` | Start a background extraction thread for a YouTube channel |
| `GET` | `/api/status` | Poll current extraction status |
| `GET` | `/api/subtitles` | Retrieve in-memory transcripts after extraction |
| `GET` | `/api/download` | Download `viral_dna.txt` from disk |
| `POST` | `/api/generate-viral-dna` | Send transcripts to Gemini; returns Viral DNA analysis |
| `POST` | `/api/generate-script` | Send Viral DNA + topic to Gemini; returns final script |

**Socket.IO events**:

| Direction | Event | Payload |
|---|---|---|
| Server → Client | `connected` | `{status: "connected"}` |
| Server → Client | `progress` | `{status, message, progress, current?, total?, videos_processed?, output_file?}` |

**Gemini integration** (`google-generativeai`):
- Model: `gemini-3-flash-preview`
- Both `/api/generate-viral-dna` and `/api/generate-script` use `temperature=1.0`, `max_output_tokens=8192`
- The Viral DNA prompt (`VIRAL_DNA_SYSTEM_INSTRUCTION`) instructs the model to analyze syntax/psychology, not topic content
- The script prompt (`VIRAL_SCRIPT_SYSTEM_INSTRUCTION`) is a multi-phase pipeline: Draft → Roast (5 hostile reviewers) → Rebuild → Final output

### Backend (`backend/extractor.py`)

- `clean_url(url)` — forces the YouTube channel URL to the `/videos?sort=p` (most popular) tab
- `get_viral_videos(channel_url, limit)` — uses `yt-dlp` in flat-extract mode to list video metadata (no download)
- `get_transcript_apify(video_id)` — calls Apify actor `faVsWy9VTSNVIhWpR`, waits for result, joins segment texts
- `extract_viral_content(channel_url, limit, progress_callback)` — orchestrates the full flow, saves `viral_dna.txt` to the **backend working directory**, and reports progress via callback

The output file `viral_dna.txt` is written relative to wherever `python app.py` is executed (normally `backend/`). It is gitignored.

### Frontend (`frontend/src/App.jsx`)

Single React component (`App`) managing a **3-step wizard**:

| Step | User Action |
|---|---|
| 1 | Provide subtitles: either scrape a YouTube channel URL, or paste transcripts manually |
| 2 | Review extracted subtitles; trigger Gemini Viral DNA analysis |
| 3 | Enter a video topic; generate the final viral script |

- Socket.IO client connects to `http://localhost:5002` on mount and listens for `progress` events
- All API calls target `API_URL = 'http://localhost:5002'`
- State management: plain `useState` — no external state library
- Styling: Tailwind CSS with a dark `gray-900`/`purple-900` gradient theme
- Custom Tailwind animation: `pulse-slow` (3 s pulse, defined in `tailwind.config.js`)

---

## Environment Variables

Copy `.env.example` to `.env` in the **project root** before running:

```
APIFY_API_KEY=your_apify_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

`python-dotenv` loads `.env` automatically when `app.py` starts. Neither key has a default value that enables functionality — the app will return errors without them.

- **APIFY_API_KEY**: From [Apify Console → Account → Integrations](https://console.apify.com/account/integrations)
- **GEMINI_API_KEY**: From [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## Development Workflow

### Prerequisites

- Python 3.8+
- Node.js 16+

### Setup

```bash
# Backend
cd backend
pip install -r requirements.txt

# Frontend
cd frontend
npm install
```

### Running Locally

Two terminals are required:

```bash
# Terminal 1 — Backend (port 5002)
cd backend
python app.py

# Terminal 2 — Frontend (port 3100)
cd frontend
npm run dev
```

Alternatively, use the one-command script:

```bash
./start.sh   # Mac/Linux
start.bat    # Windows
```

> **Note**: `start.sh` creates a Python venv at `backend/venv/`. If you prefer a global or conda environment, run backend setup manually and skip the script.

**Access points**:
- Frontend: `http://localhost:3100`
- Backend API: `http://localhost:5002`

### Frontend Build

```bash
cd frontend
npm run build    # outputs to frontend/dist/
npm run preview  # serves the production build locally
```

---

## Key Conventions

### Port numbers

There is a discrepancy between documentation and actual config:

| Location | Claimed port |
|---|---|
| `README.md` / `QUICKSTART.md` / `start.sh` | Backend: 5000, Frontend: 3000 |
| `app.py` (actual) | Backend: **5002** |
| `vite.config.js` (actual) | Frontend: **3100** |
| `App.jsx` `API_URL` | `http://localhost:5002` |

Always trust the source code over the docs.

### State persistence

All state (extracted subtitles, Viral DNA, scripts) is **in-memory only**. Restarting the backend clears everything. The only disk persistence is `viral_dna.txt` written by `extractor.py`.

### Extraction concurrency

Only one extraction job can run at a time. The `extraction_status['running']` flag guards this — a second `POST /api/extract` while one is running returns HTTP 400.

### Gemini model name

The code uses `gemini-3-flash-preview` (a preview model ID). If this model is deprecated or renamed, both `/api/generate-viral-dna` and `/api/generate-script` will fail with a Gemini API error. Update `model_name` in both route handlers in `app.py`.

### Apify actor

Actor ID `faVsWy9VTSNVIhWpR` is hardcoded in `extractor.py`. The actor expects input `{"videoUrl": "<full_url>"}` and returns items with `{"data": [{"start", "dur", "text"}, ...]}`.

### No tests

There are currently no automated tests in this repository. Manual testing via the browser UI is the only validation mechanism.

### No linter / formatter config

No ESLint, Prettier, Black, or Ruff configuration files exist. Follow the existing style when adding code:
- Python: standard PEP 8, f-strings, no type annotations
- JavaScript/JSX: functional React components, arrow functions, no TypeScript

---

## Common Tasks for AI Assistants

### Adding a new API endpoint

1. Add the route function to `backend/app.py` following the existing `@app.route` pattern.
2. Call the endpoint from `frontend/src/App.jsx` using `fetch()` targeting `API_URL`.
3. Update this file's endpoint table above.

### Changing the Gemini model or prompts

- Both system prompts (`VIRAL_DNA_SYSTEM_INSTRUCTION`, `VIRAL_SCRIPT_SYSTEM_INSTRUCTION`) and the model name are defined at the top of `backend/app.py`.
- `VIRAL_SCRIPT_SYSTEM_INSTRUCTION` uses `.format(viral_dna=viral_dna)` — keep the `{viral_dna}` placeholder when editing it.

### Changing ports

- Backend port: `socketio.run(..., port=5002)` in `app.py`
- Frontend dev port: `server.port` in `frontend/vite.config.js`
- Frontend API target: `API_URL` constant in `frontend/src/App.jsx`

All three must be consistent.

### Debugging extraction issues

The extractor prints detailed `DEBUG:` lines to stdout for each Apify call, including full tracebacks on failure. Run the backend in a terminal to see these logs — they are not surfaced in the UI.
