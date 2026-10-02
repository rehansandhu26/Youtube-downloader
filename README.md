# 🚀 TubeLoad - YouTube Video & Audio Downloader

TubeLoad is a modern, high-performance web utility for downloading publicly accessible YouTube videos and audio. Built with FastAPI, Tailwind CSS, Lucide Icons, and Firebase Authentication (Google Sign-in) with Firestore-backed cloud download history.

---

## ✨ Features

- 🎥 **High-Definition Video Downloads**: Supports multiple qualities (1080p Full HD, 720p, 480p, 360p).
- 🎵 **High-Bitrate MP3 Extraction**: Extract crystal-clear audio at up to 320 kbps.
- 🔐 **Google Sign-In & Cloud History**: Authenticate with Google to automatically track, store, and re-download your previous video history across any device.
- 📋 **Terms of Use Enforcement**: Integrated legal compliance modal with explicit agreement tracking before downloading.
- 📱 **Fully Responsive UI**: YouTube-inspired dark SaaS aesthetic with smooth glassmorphism, glowing accents, and mobile-friendly layouts.
- 🎬 **Unlisted & Long-Form Video Support**: Supports unlisted links, documentaries, and full-length public domain videos.
- 🌐 **Global Access Ready**: Includes one-click scripts for local Wi-Fi sharing and worldwide Cloudflare tunnel hosting.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.12, FastAPI, Uvicorn, yt-dlp, FFmpeg
- **Frontend**: HTML5, Tailwind CSS, Lucide Icons, Vanilla JavaScript
- **Auth & Database**: Firebase Authentication (Google Sign-In), Cloud Firestore
- **Networking**: Cloudflare Tunnel (TCP / HTTP2)

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10+
- FFmpeg installed and accessible in your system PATH
- Git

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/tubeload.git
   cd tubeload
   ```

2. **Create a virtual environment:**
   ```bash
   python -m venv .venv
   ```

3. **Activate the virtual environment:**
   - **Windows:**
     ```powershell
     .\.venv\Scripts\activate
     ```
   - **Linux / macOS:**
     ```bash
     source .venv/bin/activate
     ```

4. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

---

## ⚡ Running the Application

### Option 1: Local Server Only
- **Windows**: Double-click `run.bat`
- **Manual**:
  ```bash
  python run.py
  ```
  Visit: `http://localhost:8000`

### Option 2: Global Public Access (Cloudflare Tunnel)
- **Windows**: Double-click `run_public.bat`
  *(Launches the FastAPI backend and generates a secure public HTTPS link accessible worldwide).*

---

## 🔒 Firebase Configuration

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/).
2. Enable **Google Sign-in** in Firebase Authentication.
3. Enable **Cloud Firestore** and deploy the included `firestore.rules`.
4. Update `static/js/firebase-init.js` with your Firebase web configuration keys.

---

## 📄 License & Disclaimer

This project is intended strictly for personal, educational, and fair-use purposes. Please only process publicly accessible content that you have permission or rights to download. TubeLoad is an independent open-source utility and is not affiliated with or endorsed by YouTube or Google.
