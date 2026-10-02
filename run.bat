@echo off
title TubeLoad - YouTube Video Downloader
cd /d "%~dp0"
echo Starting TubeLoad Server...
if exist ".venv\Scripts\python.exe" (
    ".venv\Scripts\python.exe" run.py
) else (
    python run.py
)
pause
