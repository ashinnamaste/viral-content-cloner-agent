# 🎬 Viral DNA Extractor

A beautiful web interface to extract transcripts from the most popular videos on any YouTube channel. Upload the results to NotebookLM to discover viral content patterns and strategies.

## ✨ Features

- 🎯 **Smart Video Selection**: Automatically fetches the most popular videos (sorted by views)
- 📊 **Real-time Progress**: Live updates as videos are processed
- 🎨 **Modern UI**: Beautiful gradient interface with smooth animations
- 📥 **Easy Download**: One-click download of extracted transcripts
- ⚡ **Fast & Efficient**: Processes multiple videos with progress tracking

## 🚀 Quick Start

### Prerequisites

- Python 3.8 or higher
- Node.js 16 or higher
- npm or yarn

### API Keys Setup

1. **Copy the environment template:**
```bash
cp .env.example .env
```

2. **Get your API keys:**
   - **Apify API Key**: Sign up at [Apify](https://console.apify.com/) and get your key from Account → Integrations
   - **Gemini API Key**: Get it from [Google AI Studio](https://aistudio.google.com/app/apikey)

3. **Add your keys to `.env`:**
```
APIFY_API_KEY=your_actual_apify_key
GEMINI_API_KEY=your_actual_gemini_key
```

### Installation

1. **Install Backend Dependencies**
```bash
cd backend
pip install -r requirements.txt
```

2. **Install Frontend Dependencies**
```bash
cd ../frontend
npm install
```

### Running the Application

You need to run both the backend and frontend:

**Terminal 1 - Backend (Flask Server)**
```bash
cd backend
python app.py
```

**Terminal 2 - Frontend (React App)**
```bash
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📖 How to Use

1. Open the app in your browser (http://localhost:3000)
2. Paste a YouTube channel URL (e.g., `https://www.youtube.com/@channelname`)
3. Set how many videos you want to extract (default: 20)
4. Click "Start Extraction"
5. Watch the real-time progress
6. Download the `viral_dna.txt` file when complete
7. Upload to NotebookLM for AI-powered analysis

## 🎯 What It Does

The extractor:
- Takes any YouTube channel URL
- Automatically sorts videos by popularity (most viewed)
- Extracts transcripts from each video
- Saves everything to a single text file
- Provides real-time progress updates

Perfect for:
- Content creators studying viral patterns
- Marketers analyzing competitor strategies
- Researchers examining popular content
- Anyone wanting to understand what makes content go viral

## 🛠️ Technical Stack

**Backend:**
- Flask (Python web framework)
- Flask-SocketIO (Real-time communication)
- yt-dlp (YouTube video discovery)
- Apify (Transcript extraction)
- Google Gemini AI (Viral DNA analysis & script generation)

**Frontend:**
- React (UI framework)
- Vite (Build tool)
- Tailwind CSS (Styling)
- Socket.IO (Real-time updates)

## 📝 Notes

- Some videos may not have transcripts available (music videos, etc.)
- The script includes delays to avoid rate limiting
- The extractor saves to `viral_dna.txt` in the backend directory
- All processing happens locally on your machine

## 🐛 Troubleshooting

**Backend won't start:**
- Make sure all Python dependencies are installed: `pip install -r requirements.txt`
- Check if port 5000 is already in use

**Frontend won't start:**
- Delete `node_modules` and run `npm install` again
- Check if port 3000 is already in use

**No transcripts found:**
- Some videos don't have captions enabled
- Try a different channel or increase the video limit

## 📄 License

MIT License - feel free to use and modify as needed!

## 🙏 Credits

Built with your updated viral script that forces YouTube to show the most popular videos, not just recent uploads.
