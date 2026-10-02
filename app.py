import os
import re
import time
import uuid
import shutil
import threading
import urllib.parse
from typing import Dict, Any, Optional
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import yt_dlp

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DOWNLOADS_DIR = BASE_DIR / "downloads"

STATIC_DIR.mkdir(parents=True, exist_ok=True)
DOWNLOADS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(
    title="TubeLoad - YouTube Video Downloader",
    description="Online utility to process and download publicly accessible YouTube videos and audio.",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory tracking for active and completed download jobs
jobs: Dict[str, Dict[str, Any]] = {}

def clean_old_downloads():
    """Removes downloaded temporary media older than 4 hours."""
    now = time.time()
    try:
        for f in DOWNLOADS_DIR.glob("*"):
            if f.is_file() and (now - f.stat().st_mtime > 14400):
                f.unlink(missing_ok=True)
    except Exception as e:
        print(f"Error cleaning downloads: {e}")

def sanitize_filename(name: str) -> str:
    clean = re.sub(r'[\\/*?:"<>|]', "", name)
    clean = clean.strip()
    return clean[:90] if len(clean) > 90 else clean

def format_duration(seconds: Optional[int]) -> str:
    if not seconds:
        return "00:00"
    minutes, sec = divmod(seconds, 60)
    hours, minutes = divmod(minutes, 60)
    if hours > 0:
        return f"{hours}:{minutes:02d}:{sec:02d}"
    return f"{minutes:02d}:{sec:02d}"

def format_views(count: Optional[int]) -> str:
    if not count:
        return "0 views"
    if count >= 1_000_000_000:
        return f"{count / 1_000_000_000:.2f}B views"
    if count >= 1_000_000:
        return f"{count / 1_000_000:.1f}M views"
    if count >= 1_000:
        return f"{count / 1_000:.1f}K views"
    return f"{count:,} views"

def format_bytes(b: Optional[int]) -> str:
    if not b:
        return "N/A"
    for unit in ['B', 'KB', 'MB', 'GB']:
        if b < 1024.0:
            return f"{b:.1f} {unit}"
        b /= 1024.0
    return f"{b:.1f} TB"

def is_youtube_url(url: str) -> bool:
    clean_url = url.strip()
    patterns = [
        r"^(https?://)?(www\.|m\.)?youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}",
        r"^(https?://)?(www\.|m\.)?youtube\.com/shorts/[a-zA-Z0-9_-]{11}",
        r"^(https?://)?(www\.|m\.)?youtube\.com/embed/[a-zA-Z0-9_-]{11}",
        r"^(https?://)?(www\.|m\.)?youtube\.com/v/[a-zA-Z0-9_-]{11}",
        r"^(https?://)?youtu\.be/[a-zA-Z0-9_-]{11}",
        r"^(https?://)?music\.youtube\.com/watch\?v=[a-zA-Z0-9_-]{11}",
    ]
    for p in patterns:
        if re.search(p, clean_url, re.IGNORECASE):
            return True
    if ("youtube.com" in clean_url or "youtu.be" in clean_url) and len(clean_url) > 10:
        return True
    return False

class DownloadRequest(BaseModel):
    url: str
    format_type: str = "video"  # "video" or "audio"
    quality: str = "1080"      # "best", "1080", "720", "480", "360", "mp3_320", "mp3_192"

@app.get("/api/info")
def get_video_info(url: str = Query(..., description="Public YouTube Video URL")):
    """Retrieves metadata and only actual supported formats from YouTube."""
    clean_old_downloads()
    url = url.strip()

    if not is_youtube_url(url):
        raise HTTPException(
            status_code=400,
            detail="Please enter a valid YouTube URL."
        )

    ydl_opts = {
        'quiet': True,
        'no_warnings': True,
        'extract_flat': False,
    }

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            if not info:
                raise HTTPException(
                    status_code=404,
                    detail="This video could not be processed. Please try another publicly accessible video."
                )

            formats = info.get("formats", [])
            video_heights = set()
            fps_map = {}
            for f in formats:
                h = f.get("height")
                fps = f.get("fps")
                if h and f.get("vcodec") != "none":
                    video_heights.add(h)
                    if fps and (h not in fps_map or fps > fps_map[h]):
                        fps_map[h] = fps

            sorted_heights = sorted(list(video_heights), reverse=True)

            # Build available video resolutions based ONLY on what is actually available
            standard_resolutions = [
                {"height": 2160, "label": "4K Ultra HD (2160p)"},
                {"height": 1440, "label": "2K Quad HD (1440p)"},
                {"height": 1080, "label": "1080p Full HD"},
                {"height": 720,  "label": "720p HD"},
                {"height": 480,  "label": "480p"},
                {"height": 360,  "label": "360p"},
            ]

            available_video_qualities = []

            # 1. Best Available (default)
            highest_h = sorted_heights[0] if sorted_heights else 1080
            available_video_qualities.append({
                "id": "best",
                "label": f"Best Available ({highest_h}p)",
                "height": highest_h,
                "note": "Maximum video quality & clear audio"
            })

            # 2. Individual supported resolutions
            for res in standard_resolutions:
                h = res["height"]
                if any(vh >= h for vh in sorted_heights):
                    available_video_qualities.append({
                        "id": str(h),
                        "label": res["label"],
                        "height": h,
                        "note": "MP4 format"
                    })

            # Audio options supported by backend via FFmpeg
            audio_qualities = [
                {
                    "id": "mp3_320",
                    "label": "MP3 (320 kbps)",
                    "note": "High quality audio"
                },
                {
                    "id": "mp3_192",
                    "label": "MP3 (192 kbps)",
                    "note": "Standard audio quality"
                }
            ]

            duration = info.get("duration", 0)
            video_id = info.get("id")
            hq_thumb = f"https://i.ytimg.com/vi/{video_id}/maxresdefault.jpg" if video_id else info.get("thumbnail")

            return {
                "id": video_id,
                "title": info.get("title", "YouTube Video"),
                "uploader": info.get("uploader") or info.get("channel", "YouTube Creator"),
                "duration": duration,
                "duration_formatted": format_duration(duration),
                "views": info.get("view_count", 0),
                "views_formatted": format_views(info.get("view_count")),
                "thumbnail": hq_thumb,
                "video_url": url,
                "video_qualities": available_video_qualities,
                "audio_qualities": audio_qualities
            }

    except HTTPException:
        raise
    except Exception as e:
        err = str(e)
        if "Video unavailable" in err or "Private video" in err:
            raise HTTPException(
                status_code=400,
                detail="This video could not be processed. Please try another publicly accessible video."
            )
        if "Sign in" in err or "age" in err.lower():
            raise HTTPException(
                status_code=400,
                detail="This video requires sign-in or is age-restricted. Please try a publicly accessible video."
            )
        raise HTTPException(
            status_code=400,
            detail="Something went wrong while processing the video. Please try again."
        )


def run_download_job(job_id: str, url: str, format_type: str, quality: str):
    """Background download job executor."""
    job = jobs[job_id]

    def progress_hook(d):
        if d['status'] == 'downloading':
            total_bytes = d.get('total_bytes') or d.get('total_bytes_estimate') or 0
            downloaded = d.get('downloaded_bytes', 0)

            percent = 0.0
            if total_bytes > 0:
                percent = round((downloaded / total_bytes) * 100, 1)
            else:
                p_str = d.get('_percent_str', '0%').replace('%', '').strip()
                try:
                    percent = float(p_str)
                except ValueError:
                    percent = 0.0

            speed = d.get('_speed_str', '').strip()
            eta = d.get('_eta_str', '').strip()

            job['status'] = 'downloading'
            job['progress'] = min(percent, 98.0)
            job['speed'] = speed if speed else "Downloading..."
            job['eta'] = eta if eta else "Calculating..."
            job['status_text'] = f"Downloading media: {job['progress']}%"

        elif d['status'] == 'finished':
            job['status'] = 'processing'
            job['progress'] = 99.0
            job['status_text'] = "Finalizing file with FFmpeg..."

    output_template = str(DOWNLOADS_DIR / f"{job_id}_%(title).80s.%(ext)s")

    ydl_opts: Dict[str, Any] = {
        'outtmpl': output_template,
        'progress_hooks': [progress_hook],
        'quiet': True,
        'no_warnings': True,
        'concurrent_fragment_downloads': 4,
        'retries': 10,
        'fragment_retries': 10,
    }

    if format_type == "audio":
        bitrate = "320" if quality == "mp3_320" else "192"
        ydl_opts.update({
            'format': 'bestaudio/best',
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': bitrate,
            }],
        })
    else:
        # Video format MP4
        if quality == "best":
            ydl_opts.update({
                'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
                'merge_output_format': 'mp4',
            })
        else:
            try:
                target_h = int(quality)
                ydl_opts.update({
                    'format': f'bestvideo[height<={target_h}][ext=mp4]+bestaudio[ext=m4a]/bestvideo[height<={target_h}]+bestaudio/best[height<={target_h}]/best',
                    'merge_output_format': 'mp4',
                })
            except ValueError:
                ydl_opts.update({
                    'format': 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best',
                    'merge_output_format': 'mp4',
                })

    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([url])

        matching_files = list(DOWNLOADS_DIR.glob(f"{job_id}_*"))
        if not matching_files:
            job['status'] = 'error'
            job['error'] = 'Something went wrong while processing the video. Please try again.'
            return

        final_path = matching_files[0]
        raw_name = final_path.name
        display_name = raw_name[len(job_id) + 1 :]
        if not display_name:
            display_name = f"TubeLoad_download{final_path.suffix}"

        job['status'] = 'finished'
        job['progress'] = 100.0
        job['filename'] = display_name
        job['filepath'] = str(final_path)
        job['filesize'] = format_bytes(final_path.stat().st_size)
        job['filesize_bytes'] = final_path.stat().st_size
        job['status_text'] = "Ready to download"

    except Exception as e:
        job['status'] = 'error'
        job['error'] = 'Something went wrong while processing the video. Please try again.'
        job['status_text'] = 'Processing failed.'


@app.post("/api/download")
def start_download(req: DownloadRequest):
    """Initiates an asynchronous download job."""
    clean_old_downloads()
    url = req.url.strip()

    if not is_youtube_url(url):
        raise HTTPException(status_code=400, detail="Please enter a valid YouTube URL.")

    job_id = str(uuid.uuid4())[:8]
    jobs[job_id] = {
        "status": "pending",
        "progress": 0.0,
        "speed": "",
        "eta": "",
        "filename": "",
        "filepath": "",
        "filesize": "",
        "error": "",
        "status_text": "Analyzing video...",
        "created_at": time.time()
    }

    thread = threading.Thread(
        target=run_download_job,
        args=(job_id, url, req.format_type, req.quality),
        daemon=True
    )
    thread.start()

    return {"job_id": job_id, "status": "started"}


@app.get("/api/progress/{job_id}")
def get_progress(job_id: str):
    """Retrieves real-time processing progress of a download job."""
    job = jobs.get(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job_id,
        "status": job["status"],
        "progress": job["progress"],
        "speed": job["speed"],
        "eta": job["eta"],
        "filename": job["filename"],
        "filesize": job.get("filesize", ""),
        "filesize_bytes": job.get("filesize_bytes", 0),
        "status_text": job["status_text"],
        "error": job.get("error", "")
    }


@app.get("/api/file/{job_id}")
def serve_download_file(job_id: str):
    """Serves the processed video or audio file as an attachment."""
    job = jobs.get(job_id)
    if not job or job["status"] != "finished":
        raise HTTPException(status_code=404, detail="File is not ready.")

    filepath = Path(job["filepath"])
    if not filepath.exists():
        raise HTTPException(status_code=404, detail="File not found on server.")

    raw_filename = job.get("filename", "") or filepath.name
    ext = filepath.suffix.lower()
    mime_type = "video/mp4"
    if ext == ".mp3":
        mime_type = "audio/mpeg"
    elif ext == ".m4a":
        mime_type = "audio/mp4"
    elif ext == ".webm":
        mime_type = "video/webm"

    # RFC 5987 / RFC 6266 compliant Content-Disposition
    # Prevents Starlette/Uvicorn latin-1 UnicodeEncodeError when titles contain Urdu, Arabic, emojis, etc.
    stem = Path(raw_filename).stem
    # Strictly allow only ASCII letters, numbers, spaces, dots, dashes, underscores
    safe_ascii_stem = re.sub(r'[^a-zA-Z0-9_\-\. ]', '', stem).strip()
    safe_ascii_stem = re.sub(r'\s+', ' ', safe_ascii_stem)
    if not safe_ascii_stem:
        safe_ascii_stem = "TubeLoad_download"
    safe_ascii_filename = f"{safe_ascii_stem}{ext}"

    # UTF-8 percent-encoded filename for full Unicode fidelity in modern browsers
    encoded_filename = urllib.parse.quote(raw_filename, safe="")
    content_disposition = f'attachment; filename="{safe_ascii_filename}"; filename*=UTF-8\'\'{encoded_filename}'

    headers = {
        "Content-Disposition": content_disposition,
        "Access-Control-Expose-Headers": "Content-Disposition",
        "Cache-Control": "no-cache",
    }

    return FileResponse(
        path=filepath,
        media_type=mime_type,
        headers=headers
    )


# Mount static frontend
app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
