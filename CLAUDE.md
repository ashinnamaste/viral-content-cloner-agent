# CLAUDE.md — Viral Content Cloner Agent

This file documents the codebase structure, development workflows, and conventions for AI assistants working in this repository.

---

## Project Overview

**Viral Content Cloner Agent** is a full-stack web application that reverse-engineers the "viral formula" of YouTube creators. It extracts transcripts from a channel's most popular videos, uses Google Gemini AI to analyze the structural patterns (the "Viral DNA"), and then generates custom scripts for new topics that replicate those patterns.

**User-facing workflow (3 steps):**

1. **Get Subtitles** — Scrape transcripts from a YouTube channel via Apify, or paste transcripts manually.
2. **Generate Viral DNA** — Submit transcripts to Gemini AI, which produces a structural style guide (hook architecture, retention loops, sentence rhythm, fill-in-the-blanks template).
3. **Generate Script** — Provide a new video topic; Gemini uses the Viral DNA as a system prompt and runs a Draft → Roast → Fix pipeline to produce a polished, viral-ready script.

---

## Repository Structure

```
viral-content-cloner-agent/
├── backend/
│   ├── app.py              # Flask server, REST API, WebSocket, Gemini AI calls
│   ├── extractor.py        # YouTube video discovery (yt-dlp) + transcript extraction (Apify)
│   └── requirements.txt    # Python dependencies (pinned versions)
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Single-component React app (all UI and logic)
│   │   ├── main.jsx        # React root mount
│   │   └── index.css       # Tailwind CSS directives + base styles
│   ├── index.html          # HTML entry point (emoji favicon, root div)
│   ├── package.json        # Node scripts and dependencies
│   ├── vite.config.js      # Vite config — dev server on port 3100
│   ├── tailwind.config.js  # Tailwind config — custom pulse-slow animation
│   └── postcss.config.js   # PostCSS — Tailwind + Autoprefixer
├── .env.example            # Required env vars template
├── .gitignore
├── README.md
├── QUICKSTART.md
├── start.sh                # One-command startup (Linux/macOS)
└── start.bat               # One-command startup (Windows)
```

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend framework | React | 18.2.0 |
| Frontend build tool | Vite | 5.0.8 |
| CSS framework | Tailwind CSS | 3.4.0 |
| Real-time client | socket.io-client | 4.7.2 |
| Backend framework | Flask | 3.0.0 |
| WebSocket server | Flask-SocketIO | 5.3.5 |
| Video discovery | yt-dlp | 2024.3.10 |
| Transcript extraction | apify-client | 1.7.0 |
| AI generation | google-generativeai | 0.8.3 |
| Env loading | python-dotenv | 1.0.0 |
| Runtime | Python 3.8+ / Node.js 16+ | — |

---

## Environment Variables

Copy `.env.example` to `.env` in the project root before running the backend.

```
APIFY_API_KEY=your_apify_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

- `APIFY_API_KEY` — obtained from [console.apify.com/account/integrations](https://console.apify.com/account/integrations). Used to call the Apify actor `faVsWy9VTSNVIhWpR` (YouTube Transcript Extractor).
- `GEMINI_API_KEY` — obtained from [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey). Used to call `gemini-3-flash-preview`.

Both keys are loaded by `python-dotenv` in `backend/app.py:11` via `load_dotenv()`. If `GEMINI_API_KEY` is absent, the `/api/generate-viral-dna` and `/api/generate-script` endpoints return HTTP 500.

---

## Running the Application

### Quickstart (recommended)

```bash
# Linux/macOS
./start.sh

# Windows
start.bat
```

`start.sh` creates a Python virtualenv (if missing), installs all backend and frontend dependencies, then starts both services concurrently.

### Manual startup

**Backend** (terminal 1):
```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example ../.env        # edit .env with real keys
python app.py
# Listens on http://localhost:5002
```

**Frontend** (terminal 2):
```bash
cd frontend
npm install
npm run dev
# Listens on http://localhost:3100
```

Open `http://localhost:3100` in a browser.

### Frontend scripts

| Command | Action |
|---|---|
| `npm run dev` | Dev server with hot module replacement on port 3100 |
| `npm run build` | Production bundle output to `dist/` |
| `npm run preview` | Preview the production build locally |

---

## Backend API Reference

All routes are in `backend/app.py`. The frontend hardcodes `API_URL = 'http://localhost:5002'` in `frontend/src/App.jsx:4`.

### REST endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/extract` | Start background transcript extraction |
| `GET` | `/api/status` | Poll current extraction status |
| `GET` | `/api/subtitles` | Retrieve extracted subtitles from memory |
| `GET` | `/api/download` | Download `viral_dna.txt` as attachment |
| `POST` | `/api/generate-viral-dna` | Analyze subtitles with Gemini AI |
| `POST` | `/api/generate-script` | Generate viral script via Gemini AI |

**`POST /api/extract` body:**
```json
{ "channel_url": "https://www.youtube.com/@channelname", "limit": 10 }
```
Limit is clamped to 1–20 in the frontend but not validated server-side.

**`POST /api/generate-viral-dna` body:**
```json
{ "subtitles": "<full transcript text>" }
```
If `subtitles` is omitted, the server falls back to `extracted_subtitles['content']` from the last extraction run.

**`POST /api/generate-script` body:**
```json
{ "viral_dna": "<analysis text>", "topic": "Why most people fail at investing" }
```

### WebSocket events

The server uses Flask-SocketIO. The frontend connects on mount (`useEffect`) and disconnects on unmount.

| Direction | Event | Payload |
|---|---|---|
| Server → Client | `connected` | `{ "status": "connected" }` |
| Server → Client | `progress` | `{ status, message, progress, current?, total?, videos_processed?, output_file? }` |

`progress.status` values: `starting`, `scanning`, `extracting`, `success`, `warning`, `error`, `complete`.

The `complete` status triggers the frontend to call `GET /api/subtitles` automatically.

---

## Backend Architecture Details

### In-memory state (`app.py:23-34`)

Two module-level dicts hold state between requests:

```python
extraction_status = { 'running': False, 'progress': 0, 'message': '', 'status': 'idle' }
extracted_subtitles = { 'content': '', 'videos_processed': 0 }
```

This means the backend is **single-user and stateless across restarts**. Restarting the server clears all extracted data.

### Background threading (`app.py:123-144`)

`POST /api/extract` spawns a daemon thread running `run_extraction()` so the HTTP response returns immediately. Progress is emitted via `socketio.emit('progress', data)` in the `progress_callback` closure.

### Gemini AI prompts (`app.py:37-115`)

Two system instructions are defined as module-level string constants:

- **`VIRAL_DNA_SYSTEM_INSTRUCTION`** (`app.py:37-58`) — instructs Gemini to reverse-engineer hook architecture, retention loops, sentence rhythm, and produce a fill-in-the-blanks template. Explicitly forbids summarizing content.
- **`VIRAL_SCRIPT_SYSTEM_INSTRUCTION`** (`app.py:60-115`) — a three-phase pipeline: Draft (architect), Roast (5 hostile reviewers + Fail & Fix), Final Output (title options, visual hook, script with timestamps, virality checklist). The `{viral_dna}` placeholder is filled via `.format()` at call time (`app.py:245`).

Both calls use:
- Model: `gemini-3-flash-preview`
- `temperature=1.0`
- `max_output_tokens=8192`

### Extractor (`extractor.py`)

**`clean_url(url)`** (`extractor.py:11-23`) — appends `/videos?view=0&sort=p` to any channel URL to force YouTube to return most-viewed videos instead of recent uploads.

**`get_viral_videos(channel_url, limit)`** — uses `yt-dlp` with `extract_flat=True` to fetch metadata (no download). Returns a list of entry dicts with `id` and `title` keys.

**`get_transcript_apify(video_id)`** — calls Apify actor `faVsWy9VTSNVIhWpR` with `{ "videoUrl": "https://www.youtube.com/watch?v=<id>" }`. The actor returns `{ "data": [{ "start", "dur", "text" }, ...] }`. Segments are joined with spaces. Includes 1–2 second random sleep between calls (`extractor.py:171`).

**`extract_viral_content(channel_url, limit)`** — orchestrates the above, writes `viral_dna.txt` to the current working directory (the `backend/` directory when started via `python app.py`), and returns the full text. Progress callbacks emit integer percentages (0 → 10 on scan, 10 → 90 during extraction, 100 on completion).

---

## Frontend Architecture Details

The frontend is a **single React component** (`App.jsx`) with no routing, no global state manager, and no external UI library beyond Tailwind CSS.

### State structure (`App.jsx:8-30`)

```
currentStep        1 | 2 | 3          — controls which panel renders
inputMode          'scrape' | 'paste'  — Step 1 sub-mode

// Step 1
channelUrl, limit, isExtracting, progress, statusMessage, logs
socket, extractedSubtitles, videosProcessed, pastedSubtitles

// Step 2
isGeneratingDNA, viralDNA

// Step 3
videoTopic, isGeneratingScript, finalScript
```

### Key handlers

| Handler | Description |
|---|---|
| `handleExtract` | POST to `/api/extract`, sets `isExtracting=true` |
| `handleSkipToStep2` | Copies `pastedSubtitles` → `extractedSubtitles`, advances to step 2 |
| `handleGenerateViralDNA` | POST subtitles to `/api/generate-viral-dna`, advances to step 3 |
| `handleGenerateScript` | POST DNA + topic to `/api/generate-script` |
| `handleCopy*` / `handleDownload*` | Clipboard / Blob URL download for each content type |

### Styling conventions

- Dark background: `bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900`
- Accent color: purple/pink gradient (`from-purple-600 to-pink-600`)
- Success states: green (`green-400`, `green-900/20`)
- Cards: `bg-gray-800/80 backdrop-blur-lg rounded-2xl border border-purple-500/30`
- Monospace text blocks use `font-mono text-sm whitespace-pre-wrap`
- Custom animation `animate-pulse-slow` is defined in `tailwind.config.js`

---

## Code Conventions

### Python (backend)

- Python 3.8+ compatible; no type hints used in existing code.
- Module-level globals for shared state (`extraction_status`, `extracted_subtitles`) — thread safety relies on the GIL for dict updates.
- `print(f"DEBUG: ...")` statements are present throughout `extractor.py` for observability; they go to stdout.
- No test framework is configured. There are no existing tests.
- Dependencies are pinned in `requirements.txt`.

### JavaScript (frontend)

- React 18 with functional components and hooks only.
- No TypeScript; plain `.jsx`.
- All state lives in `App.jsx` — no context, no reducers, no external stores.
- `alert()` is used for user-facing errors (not a custom modal).
- The `socket` instance is stored in state and initialized once in `useEffect` with an empty dependency array.
- File downloads use the Blob URL pattern (create object URL → click anchor → revoke URL).

### File outputs

- `viral_dna.txt` is written to the backend's working directory and is excluded from git via `.gitignore`.
- The file is overwritten on each extraction run.

---

## Known Limitations and Gotchas

1. **Single-user only** — the in-memory `extracted_subtitles` dict is global; concurrent users overwrite each other's data.
2. **No API key validation at startup** — missing keys cause runtime 500 errors, not startup errors.
3. **No tests** — no test runner or test files exist anywhere in the project.
4. **Flask dev server** — `allow_unsafe_werkzeug=True` and `debug=True` are set; this is not suitable for production.
5. **video limit not validated server-side** — `limit` is trusted from the client; yt-dlp will just return fewer results if the channel has fewer videos.
6. **Subtitle preview truncated in UI** — `App.jsx:476` truncates to 3000 characters for display, but the full content is sent to the API.
7. **Apify actor input field** — the actor expects `"videoUrl"` (singular), not `"videoUrls"` (plural). This is hardcoded in `extractor.py:68`.
8. **`viral_dna.txt` working directory** — the file is written relative to the process CWD, which is `backend/` when running `python app.py` from that directory.

---

## Adding New Features — Checklist

- **New API endpoint**: add route to `backend/app.py`, update `API_URL` base path if needed, add handler in `App.jsx`.
- **New AI prompt**: add a new `*_SYSTEM_INSTRUCTION` constant in `app.py`, create a `GenerativeModel` with it, and call `generate_content`.
- **New extraction source**: implement a function in `extractor.py` following the `get_transcript_apify` pattern (accepts `video_id`, returns plain text or `None`).
- **New UI step**: increment the `StepIndicator` max, add a new `currentStep === N` block in the JSX, add corresponding state variables at the top of `App`.
- **Environment variable**: add to `.env.example`, read with `os.environ.get('VAR_NAME', '')` in `app.py`, document here.
